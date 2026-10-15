// Reproduce the Sepolia worked example offline: run the reference resolver against the JSON-RPC responses recorded in
// deployments/sepolia/rpc-replay.json (pinned to one block) and compare with deployments/sepolia/resolved-{A,B}.json.
//
//   node scripts/sepolia-replay.js            # replay both anchors and diff against the recorded results
//   node scripts/sepolia-replay.js --live <rpc-url>   # same resolution against a live Sepolia RPC (results drift as blocks pass)
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { snapshotFromChain, resolveSnapshot } = require("../tools/aid-resolve/resolve.js");
const DEP = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json")));
const REPLAY = path.join(__dirname, "..", "deployments", "sepolia", "rpc-replay.json");

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
  let ok = true;
  for (const [name, anchor] of [["A", DEP.workedExample.anchorA], ["B", DEP.workedExample.anchorB]]) {
    const snapshot = await snapshotFromChain(provider, registry, anchor, null, fromBlock);
    const resolved = await resolveSnapshot(snapshot, now, { provider });
    const summary = { onChainState: resolved.onChainState, resolvedState: resolved.resolvedState, authorityIntervals: resolved.authorityIntervals,
      current: resolved.facets.current.map((f) => [f.facetType, f.attribution]), unattributable: resolved.facets.unattributable.map((f) => [f.facetType, f.reason]) };
    console.log(name, anchor, JSON.stringify(summary));
    if (live < 0) {
      const recorded = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia", `resolved-${name}.json`)));
      const same = JSON.stringify({ snapshot, resolved }) === JSON.stringify(recorded);
      console.log(same ? `  matches deployments/sepolia/resolved-${name}.json` : `  DIFFERS from deployments/sepolia/resolved-${name}.json`);
      ok = ok && same;
    }
  }
  if (!ok) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
