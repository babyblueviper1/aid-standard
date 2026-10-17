// Reproduce the Sepolia worked example offline: run the reference resolver against the JSON-RPC responses recorded in
// deployments/sepolia/rpc-replay.json (pinned to one block) and compare with deployments/sepolia/resolved-{A,B}.json.
//
//   node scripts/sepolia-replay.js            # replay both anchors and diff against the recorded results
//   node scripts/sepolia-replay.js --live <rpc-url>   # same resolution against a live Sepolia RPC (results drift as blocks pass)
//   node scripts/sepolia-replay.js --manifest <dir>/manifest.json
//        # replay another recorded bundle: the manifest has the shape of deployments/sepolia.json (chainId, contracts.AIDRegistry
//        # {address, block}, workedExample {anchors: {name: address} or anchorA/anchorB, pinnedBlockTimestamp}); rpc-replay.json and
//        # resolved-<name>.json sit next to it. Optional manifest.ctx names snapshot members handed to the resolver
//        # (trustedTimestamps, issuerLogs, logEntries, linkedDocuments) and manifest.verifiers lists verifier plug-ins to load
//        # (e.g. ["ots"] for tools/aid-resolve/verifiers/ots.js).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { snapshotFromChain, resolveSnapshot } = require("../tools/aid-resolve/resolve.js");
const mi = process.argv.indexOf("--manifest");
const MANIFEST = mi > 0 ? path.resolve(process.argv[mi + 1]) : path.join(__dirname, "..", "deployments", "sepolia.json");
const DEP = JSON.parse(fs.readFileSync(MANIFEST));
// the recorded files sit next to the manifest, or in a directory named after it (deployments/sepolia.json -> deployments/sepolia/)
const BUNDLE = fs.existsSync(path.join(path.dirname(MANIFEST), "rpc-replay.json")) ? path.dirname(MANIFEST) : path.join(path.dirname(MANIFEST), path.basename(MANIFEST, ".json"));
const REPLAY = path.join(BUNDLE, "rpc-replay.json");

class ReplayProvider extends ethers.JsonRpcProvider {
  constructor(responses) {
    super("http://replay.invalid", DEP.chainId, { staticNetwork: ethers.Network.from(DEP.chainId), batchMaxCount: 1 });
    this.responses = responses;
  }
  async _send(payload) {
    const reqs = Array.isArray(payload) ? payload : [payload];
    return reqs.map((r) => {
      const k = r.method + " " + JSON.stringify(r.params);
      if (k in this.responses) return { id: r.id, jsonrpc: "2.0", result: this.responses[k] };
      return { id: r.id, jsonrpc: "2.0", error: { code: -32000, message: "not recorded: " + k } };
    });
  }
}

(async () => {
  const live = process.argv.indexOf("--live");
  const provider = live > 0 ? new ethers.JsonRpcProvider(process.argv[live + 1]) : new ReplayProvider(JSON.parse(fs.readFileSync(REPLAY)).responses);
  const registry = DEP.contracts.AIDRegistry.address;
  const fromBlock = DEP.contracts.AIDRegistry.block;
  const now = live > 0 ? Math.floor(Date.now() / 1000) : DEP.workedExample.pinnedBlockTimestamp;
  const we = DEP.workedExample;
  const anchors = we.anchors ? Object.entries(we.anchors) : [["A", we.anchorA], ["B", we.anchorB]];
  const ctx = { provider };
  for (const v of DEP.verifiers || []) { const mod = require(path.join(__dirname, "..", "tools", "aid-resolve", "verifiers", v + ".js")); ctx.verifiers = { ...(ctx.verifiers || {}), [v]: mod["verify" + v[0].toUpperCase() + v.slice(1)] || mod.verify || mod.default }; }
  let ok = true;
  for (const [name, anchor] of anchors) {
    const snapshot = await snapshotFromChain(provider, registry, anchor, null, fromBlock);
    for (const k of DEP.ctx || []) if (snapshot[k] === undefined && we[k] !== undefined) snapshot[k] = we[k];
    for (const k of ["trustedTimestamps", "issuerLogs", "logEntries", "linkedDocuments"]) if (snapshot[k] !== undefined) ctx[k] = snapshot[k];
    const resolved = await resolveSnapshot(snapshot, now, ctx);
    const summary = { onChainState: resolved.onChainState, resolvedState: resolved.resolvedState, authorityIntervals: resolved.authorityIntervals,
      current: resolved.facets.current.map((f) => [f.facetType, f.attribution]), unattributable: resolved.facets.unattributable.map((f) => [f.facetType, f.reason]) };
    console.log(name, anchor, JSON.stringify(summary));
    if (live < 0) {
      const rec = path.join(BUNDLE, `resolved-${name}.json`);
      const recorded = JSON.parse(fs.readFileSync(rec));
      const same = JSON.stringify({ snapshot, resolved }) === JSON.stringify(recorded);
      console.log(same ? `  matches ${path.relative(process.cwd(), rec)}` : `  DIFFERS from ${path.relative(process.cwd(), rec)}`);
      ok = ok && same;
    }
  }
  if (!ok) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
