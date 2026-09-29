// Build resolver fixtures from the generated vectors (run after scripts/vectors.js).
const fs = require("fs");
const path = require("path");
const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "assets", "erc-aid", "vectors", "aid-vectors.json")));
const doc = v.aidDocument.document;
const base = {
  aid: doc.aid, state: 1,
  binding: { registry: v.inputs.identityRegistry, agentId: v.inputs.agentId, boundAt: 1790000000 },
  lastSeen: 1790000000, livenessWindow: 7776000, successor: null,
  documentDigest: v.aidDocument.digest, document: doc, onChainFacets: {},
  registrationFile: { type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1", name: "demo-agent", description: "fixture", image: "", active: true },
};
const dir = path.join(__dirname, "..", "assets", "erc-aid", "vectors", "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "active.json"), JSON.stringify(base, null, 2));
fs.writeFileSync(path.join(dir, "active-flag-false.json"), JSON.stringify({ ...base, registrationFile: { ...base.registrationFile, active: false } }, null, 2));
fs.writeFileSync(path.join(dir, "retired.json"), JSON.stringify({ ...base, state: 3, successor: "0x2222222222222222222222222222222222222222" }, null, 2));
fs.writeFileSync(path.join(dir, "bad-digest.json"), JSON.stringify({ ...base, documentDigest: "0x" + "00".repeat(32) }, null, 2));
console.log("fixtures written to", dir);
