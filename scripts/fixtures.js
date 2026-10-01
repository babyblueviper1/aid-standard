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
// authority-interval gap: A bound -> relation left (gap) -> relation returned (new interval)
const agentKeyed = (obs) => ({ facetType: "aid:review/erc8004/v1", provenance: "ATTESTED", issuer: doc.aid, validUntil: 1799000000, observedAt: obs, digest: "0x" + "00".repeat(32), access: { mode: "PUBLIC" }, resolver: { kind: "erc8004-reputation", chainId: 11155111, registry: "0x0000000000000000000000000000000000008004", agentId: v.inputs.agentId, tag1: "*" } });
const addrKeyed = { facetType: "aid:skills/erc8338/v1", provenance: "OBSERVED", issuer: doc.aid, validUntil: 1799000000, observedAt: 1790700000, digest: "0x" + "00".repeat(32), access: { mode: "PUBLIC" }, resolver: { kind: "erc8338", chainId: 11155111 } };
const gapDoc = { version: "aid-document/v1", aid: doc.aid, binding: doc.binding, facets: [agentKeyed(1790700000), agentKeyed(1791100000), addrKeyed] };
const { canonicalize } = require("../tools/jcs"); const { ethers } = require("ethers");
fs.writeFileSync(path.join(dir, "interval-gap.json"), JSON.stringify({ ...base, document: gapDoc, documentDigest: ethers.keccak256(ethers.toUtf8Bytes(canonicalize(gapDoc))),
  authorityIntervals: [{ from: 1790000000, until: 1790500000 }, { from: 1791000000, until: null }] }, null, 2));
// timing: same facet shape, commitment proven before / after subjectWindow.until (trustedTimestamps stands in for a proof verifier)
const timed = (ft, until) => ({ facetType: ft, provenance: "ATTESTED", issuer: doc.aid, validUntil: 1799000000, observedAt: 1790600000, subjectWindow: { from: 1790000000, until }, committedAt: { anchor: "ots", proof: { ots: "AAE=" } }, digest: "0x" + "11".repeat(32), access: { mode: "PUBLIC" }, resolver: { kind: "erc8414", chainId: 11155111 } });
const timingDoc = { version: "aid-document/v1", aid: doc.aid, binding: doc.binding, facets: [timed("aid:tasks/erc8414/v1", 1790700000), timed("aid:review/erc8004/v1", 1790500000)] };
fs.writeFileSync(path.join(dir, "timing.json"), JSON.stringify({ ...base, document: timingDoc, documentDigest: ethers.keccak256(ethers.toUtf8Bytes(canonicalize(timingDoc))),
  trustedTimestamps: { "aid:tasks/erc8414/v1": 1790600000, "aid:review/erc8004/v1": 1790600000 } }, null, 2));
// exclusivity against the issuer-declared commitment log (reference profile)
const { logTag } = require("../tools/aid-resolve/resolve");
const issuer = "eip155:11155111:0x4444444444444444444444444444444444444444";
const LOG = "https://issuer.example.invalid/commitments";
const exFacet = (ft, digest, logUri) => ({ facetType: ft, provenance: "ATTESTED", issuer, validUntil: 1799000000, observedAt: 1790600000, subjectWindow: { from: 1790000000, until: 1790700000 }, committedAt: { anchor: "ots", proof: { ots: "AAE=" }, log: { uri: logUri, position: 7 } }, digest, access: { mode: "PUBLIC" }, resolver: { kind: "erc8414", chainId: 11155111 } });
const D1 = "0x" + "21".repeat(32), D2 = "0x" + "22".repeat(32), D3 = "0x" + "23".repeat(32);
const fUnique = exFacet("aid:tasks/erc8414/v1", D1, LOG), fDup = exFacet("aid:review/erc8004/v1", D2, LOG), fUndeclared = exFacet("aid:behavior/core/v1", D3, "https://other.example.invalid/log");
const exDoc = { version: "aid-document/v1", aid: doc.aid, binding: doc.binding, facets: [fUnique, fDup, fUndeclared] };
const tagOf = (f) => logTag({ ...f, subject: doc.aid });
fs.writeFileSync(path.join(dir, "log-exclusivity.json"), JSON.stringify({ ...base, document: exDoc, documentDigest: ethers.keccak256(ethers.toUtf8Bytes(canonicalize(exDoc))),
  trustedTimestamps: { "aid:tasks/erc8414/v1": 1790600000, "aid:review/erc8004/v1": 1790600000, "aid:behavior/core/v1": 1790600000 },
  issuerLogs: { [issuer]: { uri: LOG, declaredAt: 1789000000 } },
  logEntries: { [LOG]: [{ tag: tagOf(fUnique), content: D1 }, { tag: tagOf(fDup), content: D2 }, { tag: tagOf(fDup), content: "0x" + "ff".repeat(32) }] } }, null, 2));
console.log("fixtures written to", dir);
