// Behavioural tests for AIDRegistry on the in-process Hardhat network.
// Run: npx hardhat run test/run.js
const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

const art = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build", n + ".json"), "utf8"));
const S = { DORMANT: 0n, ACTIVE: 1n, STALE: 2n, RETIRED: 3n };
let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); passed++; console.log("  ok   " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + "\n       " + (e.shortMessage || e.message)); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || "eq") + `: ${a} !== ${b}`); }
const errIface = new ethers.Interface(art("IAIDRegistry").abi);
function errName(e) {
  const m = (e.message || "").match(/return data: (0x[0-9a-f]+)/i);
  if (!m) return e.message;
  try { return errIface.parseError(m[1]).name; } catch { return m[1].slice(0, 10); }
}
async function reverts(p, sel) {
  try { await p; } catch (e) { const n = errName(e); if (sel && n !== sel && !(e.message || "").includes(sel)) throw new Error(`reverted with ${n}, expected ${sel}`); return; }
  throw new Error("expected revert " + (sel || ""));
}
const warp = async (s) => { await hre.network.provider.send("evm_increaseTime", [s]); await hre.network.provider.send("evm_mine"); };
const now = async () => (await ethers.provider.getBlock("latest")).timestamp;

async function main() {
  const [deployer, agentA, agentB, owner, relayer, stranger] = await ethers.getSigners();
  const DEF = 90 * 86400, MAX = 365 * 86400;
  const Reg = await new ethers.ContractFactory(art("AIDRegistry").abi, art("AIDRegistry").bytecode, deployer).deploy(DEF, MAX);
  const Id = await new ethers.ContractFactory(art("MockIdentityRegistry8004").abi, art("MockIdentityRegistry8004").bytecode, deployer).deploy();
  const reg = Reg.getAddress ? await Reg.getAddress() : Reg.target; const idr = await Id.getAddress();
  const R = (s) => Reg.connect(s), I = (s) => Id.connect(s);
  console.log("AIDRegistry", reg, "\nMockIdentityRegistry8004", idr);

  // owner registers two agents; agent 1 wallet = agentA, agent 2 wallet unset (owner = owner)
  await (await I(owner).register()).wait(); // id 1
  await (await I(owner).register()).wait(); // id 2
  await (await I(owner).setAgentWallet(1, agentA.address)).wait();

  console.log("\n# states & binding");
  await t("any address is DORMANT by default", async () => eq(await Reg.state(stranger.address), S.DORMANT));
  await t("bind requires agentWallet or owner == anchor", async () =>
    reverts(R(stranger).bind(idr, 1), "NotAgentOfAnchor"));
  await t("bind via agentWallet -> ACTIVE", async () => {
    await (await R(agentA).bind(idr, 1)).wait();
    eq(await Reg.state(agentA.address), S.ACTIVE);
    const b = await Reg.bindingOf(agentA.address); eq(b.registry, idr); eq(b.agentId, 1n);
    eq(await Reg.anchorOf(idr, 1), agentA.address);
  });
  await t("one anchor cannot bind twice", async () => reverts(R(agentA).bind(idr, 2), "AlreadyBound"));
  await t("one agent cannot be bound by two anchors (owner tries agent 1)", async () =>
    reverts(R(owner).bind(idr, 1), "AgentAlreadyBound"));
  await t("bind via owner -> ACTIVE (agent 2 has no wallet)", async () => {
    await (await R(owner).bind(idr, 2)).wait(); eq(await Reg.state(owner.address), S.ACTIVE);
  });
  await t("bind to non-contract registry reverts", async () => reverts(R(stranger).bind(stranger.address, 1), "NotAgentOfAnchor"));

  console.log("\n# liveness");
  await t("beyond default window -> STALE, heartbeat -> ACTIVE", async () => {
    await warp(DEF + 1); eq(await Reg.state(agentA.address), S.STALE);
    await (await R(agentA).heartbeat()).wait(); eq(await Reg.state(agentA.address), S.ACTIVE);
  });
  await t("per-anchor shorter window honoured; > max rejected; 0 resets", async () => {
    await reverts(R(agentA).setLivenessWindow(MAX + 1), "InvalidWindow");
    await (await R(agentA).setLivenessWindow(3600)).wait(); eq(await Reg.livenessWindow(agentA.address), 3600n);
    await warp(3601); eq(await Reg.state(agentA.address), S.STALE);
    await (await R(agentA).setLivenessWindow(0)).wait(); // write refreshes lastSeen too
    eq(await Reg.livenessWindow(agentA.address), BigInt(DEF)); eq(await Reg.state(agentA.address), S.ACTIVE);
  });
  await t("any anchor write refreshes lastSeen", async () => {
    const before = await Reg.lastSeen(agentA.address); await warp(10);
    await (await R(agentA).setDocumentURI("ipfs://doc", ethers.keccak256("0x01"))).wait();
    if (!((await Reg.lastSeen(agentA.address)) > before)) throw new Error("lastSeen not refreshed");
  });

  console.log("\n# binding drift");
  await t("agentWallet moved away -> STALE without any AID tx", async () => {
    await (await I(owner).setAgentWallet(1, agentB.address)).wait();
    eq(await Reg.state(agentA.address), S.STALE);
    await (await I(owner).setAgentWallet(1, agentA.address)).wait();
    eq(await Reg.state(agentA.address), S.ACTIVE);
  });
  await t("agent burned -> STALE (ownerOf reverts is caught)", async () => {
    await (await I(owner).transfer(2, stranger.address)).wait(); // owner no longer owner of 2
    eq(await Reg.state(owner.address), S.STALE);
    await (await I(stranger).burn(2)).wait(); eq(await Reg.state(owner.address), S.STALE);
  });

  console.log("\n# facets");
  const FT = ethers.keccak256(ethers.toUtf8Bytes("aid:finance/observed/v1"));
  await t("setFacet validates window and access", async () => {
    const n = await now();
    await reverts(R(agentA).setFacet(FT, ethers.ZeroHash, n, 0, 2, ""), "InvalidFacet");
    await reverts(R(agentA).setFacet(FT, ethers.ZeroHash, n, n, 2, ""), "InvalidFacet");
    await reverts(R(agentA).setFacet(FT, ethers.ZeroHash, n, n + 10, 3, ""), "InvalidAccess");
    await (await R(agentA).setFacet(FT, ethers.keccak256("0xaa"), n, n + 86400, 2, "")).wait();
    const f = await Reg.getFacet(agentA.address, FT); eq(f.access, 2n); eq(f.validUntil, BigInt(n + 86400));
    eq((await Reg.facetTypesOf(agentA.address)).length, 1);
  });
  await t("clearFacet with swap-and-pop keeps list consistent", async () => {
    const FT2 = ethers.keccak256(ethers.toUtf8Bytes("aid:behavior/runtime/v1"));
    const FT3 = ethers.keccak256(ethers.toUtf8Bytes("aid:skills/erc8338/v1"));
    const n = await now();
    await (await R(agentA).setFacet(FT2, ethers.ZeroHash, 0, n + 10, 0, "u2")).wait();
    await (await R(agentA).setFacet(FT3, ethers.ZeroHash, 0, n + 10, 1, "u3")).wait();
    await (await R(agentA).clearFacet(FT)).wait();
    const list = await Reg.facetTypesOf(agentA.address);
    eq(list.length, 2); if (!list.includes(FT2) || !list.includes(FT3)) throw new Error("list wrong");
    await reverts(R(agentA).clearFacet(FT), "UnknownFacet");
    eq((await Reg.getFacet(agentA.address, FT)).validUntil, 0n);
  });

  console.log("\n# bindWithSig (EIP-712, relayer-submitted)");
  const domain = { name: "AIDRegistry", version: "1", chainId: 31337, verifyingContract: reg };
  const types = { Bind: [
    { name: "anchor", type: "address" }, { name: "registry", type: "address" }, { name: "agentId", type: "uint256" },
    { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" } ] };
  await (await I(owner).register()).wait(); // id 3
  await (await I(owner).setAgentWallet(3, agentB.address)).wait();
  await t("EOA anchor signs, relayer submits -> bound; nonce consumed", async () => {
    const deadline = (await now()) + 3600;
    const sig = await agentB.signTypedData(domain, types, { anchor: agentB.address, registry: idr, agentId: 3, nonce: 0, deadline });
    await (await R(relayer).bindWithSig(agentB.address, idr, 3, deadline, sig)).wait();
    eq(await Reg.state(agentB.address), S.ACTIVE); eq(await Reg.nonces(agentB.address), 1n);
  });
  await t("replay / wrong signer / expired rejected", async () => {
    await (await R(agentB).unbind()).wait();
    const deadline = (await now()) + 3600;
    const sigOld = await agentB.signTypedData(domain, types, { anchor: agentB.address, registry: idr, agentId: 3, nonce: 0, deadline });
    await reverts(R(relayer).bindWithSig(agentB.address, idr, 3, deadline, sigOld), "InvalidSignature");
    const sigBad = await stranger.signTypedData(domain, types, { anchor: agentB.address, registry: idr, agentId: 3, nonce: 2, deadline });
    await reverts(R(relayer).bindWithSig(agentB.address, idr, 3, deadline, sigBad), "InvalidSignature");
    const sigExp = await agentB.signTypedData(domain, types, { anchor: agentB.address, registry: idr, agentId: 3, nonce: 3, deadline: 1 });
    await reverts(R(relayer).bindWithSig(agentB.address, idr, 3, 1, sigExp), "SignatureExpired");
  });
  await t("EIP-1271 contract anchor (smart account) binds via its owner's signature", async () => {
    const W = await new ethers.ContractFactory(art("MockERC1271Wallet").abi, art("MockERC1271Wallet").bytecode, deployer).deploy(agentB.address);
    const w = await W.getAddress();
    await (await I(owner).register()).wait(); // id 4
    await (await I(owner).setAgentWallet(4, w)).wait();
    const deadline = (await now()) + 3600;
    const sig = await agentB.signTypedData(domain, types, { anchor: w, registry: idr, agentId: 4, nonce: 0, deadline });
    await (await R(relayer).bindWithSig(w, idr, 4, deadline, sig)).wait();
    eq(await Reg.state(w), S.ACTIVE); eq(await Reg.anchorOf(idr, 4), w);
  });

  console.log("\n# retirement");
  await t("retire releases binding, is irreversible, successor can bind same agent", async () => {
    await (await R(agentA).retire(agentB.address)).wait();
    eq(await Reg.state(agentA.address), S.RETIRED); eq(await Reg.successorOf(agentA.address), agentB.address);
    eq(await Reg.anchorOf(idr, 1), ethers.ZeroAddress);
    await reverts(R(agentA).heartbeat(), "AIDRetired");
    await reverts(R(agentA).bind(idr, 1), "AIDRetired");
    await reverts(R(agentA).retire(ethers.ZeroAddress), "AIDRetired");
    // facets survive as history
    eq((await Reg.facetTypesOf(agentA.address)).length, 2);
    // successor takes over agent 1 once the 8004 wallet points to it
    await (await I(owner).setAgentWallet(1, agentB.address)).wait();
    await (await R(agentB).bind(idr, 1)).wait(); eq(await Reg.state(agentB.address), S.ACTIVE);
  });
  await t("bindWithSig for a retired anchor reverts", async () => {
    const deadline = (await now()) + 3600;
    const sig = await agentA.signTypedData(domain, types, { anchor: agentA.address, registry: idr, agentId: 1, nonce: 0, deadline });
    await reverts(R(relayer).bindWithSig(agentA.address, idr, 1, deadline, sig), "AIDRetired");
  });
  await t("supportsInterface(IAIDRegistry)", async () => {
    const iface = new ethers.Interface(art("IAIDRegistry").abi);
    let id = 0n; for (const f of iface.fragments) if (f.type === "function") id ^= BigInt(f.selector);
    const sel = "0x" + id.toString(16).padStart(8, "0");
    eq(await Reg.supportsInterface(sel), true); eq(await Reg.supportsInterface("0x01ffc9a7"), true);
    console.log("       IAIDRegistry interfaceId =", sel);
  });

  console.log("\n# end-to-end: reference resolver over the live registry");
  await t("resolver: ACTIVE anchor with data: document, digest verified, facets classified", async () => {
    const { snapshotFromChain, resolveSnapshot } = require("../tools/aid-resolve/resolve");
    const { canonicalize } = require("../tools/jcs");
    const n = await now();
    const doc = { version: "aid-document/v1", aid: `eip155:31337:${agentB.address}`, binding: { registry: idr, agentId: 1 }, facets: [
      { facetType: "aid:core/identity/v1", provenance: "SELF", issuer: `eip155:31337:${agentB.address}`, validUntil: n + 86400, digest: ethers.ZeroHash, access: { mode: "PUBLIC" }, resolver: { kind: "erc8004-identity", registry: idr, agentId: 1 } },
      { facetType: "aid:skills/erc8338/v1", provenance: "OBSERVED", issuer: `eip155:31337:${agentB.address}`, validUntil: n - 1, digest: ethers.ZeroHash, access: { mode: "PUBLIC" }, resolver: { kind: "erc8338" } },
    ] };
    const jcs = canonicalize(doc); const digest = ethers.keccak256(ethers.toUtf8Bytes(jcs));
    const uri = "data:application/json;base64," + Buffer.from(jcs).toString("base64");
    await (await R(agentB).setDocumentURI(uri, digest)).wait();
    const snap = await snapshotFromChain(ethers.provider, reg, agentB.address, null);
    const r = resolveSnapshot(snap, n + 5);
    eq(r.onChainState, "ACTIVE"); eq(r.resolvedState, "ACTIVE"); eq(r.document !== null, true);
    eq(r.facets.current.length, 1); eq(r.facets.history.length, 1); eq(r.reasons.length, 0);
  });
  await t("resolver: RETIRED anchor reports successor rule", async () => {
    const { snapshotFromChain, resolveSnapshot } = require("../tools/aid-resolve/resolve");
    const snap = await snapshotFromChain(ethers.provider, reg, agentA.address, null);
    const r = resolveSnapshot(snap, await now());
    eq(r.onChainState, "RETIRED"); eq(snap.successor, agentB.address);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
