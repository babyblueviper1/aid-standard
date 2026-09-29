// Generate test vectors for ERC-AID: facetType keys, JCS digest of the sample document,
// EIP-712 Bind digest, ERC-8419 `account` subjectKey for the anchor, IAIDRegistry interfaceId.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const { canonicalize } = require("../tools/jcs");

const out = path.join(__dirname, "..", "assets", "erc-aid", "vectors");
fs.mkdirSync(out, { recursive: true });
const abi = ethers.AbiCoder.defaultAbiCoder();

// ---- fixed inputs -------------------------------------------------------
const chainId = 11155111; // Sepolia
const anchor = "0x65ab82feC38c3A5F2A5b0bd96cB3255E7A45ae42";
const identityRegistry = "0x8004A818BFB912233c491871b3d84c89A494BD9e"; // official ERC-8004 Identity Registry
const agentId = 10387;
const aidRegistry = "0x00000000000000000000000000000000000A1D00"; // placeholder deployment address
const profiler = "0x1111111111111111111111111111111111111111";
const schemeFinance = ethers.keccak256(ethers.toUtf8Bytes("aid:finance/observed/v1#algo-hash-placeholder"));

// ---- 1. facetType keys --------------------------------------------------
const facetTypes = [
  "aid:core/identity/v1", "aid:core/kya/v1", "aid:finance/observed/v1", "aid:behavior/core/v1",
  "aid:skills/erc8338/v1", "aid:tasks/erc8414/v1", "aid:review/erc8004/v1",
];
const facetTypeKeys = Object.fromEntries(facetTypes.map((t) => [t, ethers.keccak256(ethers.toUtf8Bytes(t))]));

// ---- 2. sample AID document --------------------------------------------
const caip = `eip155:${chainId}:${anchor}`;
const doc = {
  version: "aid-document/v1",
  aid: caip,
  did: `did:aid:eip155:${chainId}:${anchor}`,
  binding: { registry: identityRegistry, agentId },
  alsoKnownAs: [`eip155:8453:${anchor}`],
  livenessWindow: 7776000,
  updatedAt: 1790000000,
  facets: [
    {
      facetType: "aid:core/identity/v1", provenance: "SELF", issuer: caip,
      validFrom: 1790000000, validUntil: 1821536000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("registration-file-placeholder")),
      access: { mode: "PUBLIC" },
      resolver: { kind: "erc8004-identity", chainId, registry: identityRegistry, agentId },
    },
    {
      facetType: "aid:core/kya/v1", provenance: "ATTESTED", issuer: `eip155:${chainId}:${profiler}`,
      validUntil: 1805536000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("kya-assertion-set-placeholder")),
      access: { mode: "PUBLIC" },
      resolver: { kind: "erc8419-assertion", chainId, registry: "0xBFCC1ABc83a0caC5E76348738c551BfAae0a09f5", schemeId: "0xc3d44c830a5c118f980f48317b97e9eaa920a7bbd204c7d3595ac191d4726764", issuers: [profiler] },
    },
    {
      facetType: "aid:finance/observed/v1", provenance: "PROVED", issuer: `eip155:${chainId}:${profiler}`,
      validFrom: 1790000000, validUntil: 1797776000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("finance-commitment-placeholder")),
      access: { mode: "ZK", verifier: "0x540B7651FA94Cd586599Deb478893D800bc3C2d8", predicates: ["leverageMax_lt", "counterpartyDispersion_gte"] },
      resolver: { kind: "erc8419-assertion", chainId, registry: "0xBFCC1ABc83a0caC5E76348738c551BfAae0a09f5", schemeId: schemeFinance, issuers: [profiler] },
    },
    {
      facetType: "aid:skills/erc8338/v1", provenance: "OBSERVED", issuer: caip,
      validUntil: 1792592000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("skills-record-placeholder")),
      access: { mode: "PUBLIC" }, uri: "ipfs://bafy.../skills.json",
      resolver: { kind: "erc8338", chainId, contracts: ["0x2222222222222222222222222222222222222222"], roles: ["creator", "owner", "executor", "genesisCreator"] },
    },
    {
      facetType: "aid:tasks/erc8414/v1", provenance: "OBSERVED", issuer: caip,
      validUntil: 1792592000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("tasks-record-placeholder")),
      access: { mode: "PUBLIC" }, uri: "ipfs://bafy.../tasks.json",
      resolver: { kind: "erc8414", chainId, contracts: ["0xA62059A498E40C4Ae4aF926E2B00C1Ff122bDdb7"], roles: ["creator", "funder", "bidder", "fulfiller", "judge"] },
    },
    {
      facetType: "aid:review/erc8004/v1", provenance: "ATTESTED", issuer: caip,
      validUntil: 1792592000, observedAt: 1790000000,
      digest: ethers.keccak256(ethers.toUtf8Bytes("review-summary-placeholder")),
      access: { mode: "PUBLIC" },
      resolver: { kind: "erc8004-reputation", chainId, registry: "0x0000000000000000000000000000000000008004", agentId, tag1: "*" },
    },
  ],
};

// validate against schemas
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const schemaDir = path.join(__dirname, "..", "assets", "erc-aid", "schemas");
const facetSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "facet.schema.json")));
const docSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, "aid-document.schema.json")));
ajv.addSchema(facetSchema);
const validate = ajv.compile(docSchema);
if (!validate(doc)) { console.error(validate.errors); process.exit(1); }
for (const f of fs.readdirSync(path.join(schemaDir, "facets"))) ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaDir, "facets", f))));

const jcs = canonicalize(doc);
const docDigest = ethers.keccak256(ethers.toUtf8Bytes(jcs));

// ---- 3. EIP-712 Bind digest ---------------------------------------------
const domain = { name: "AIDRegistry", version: "1", chainId, verifyingContract: aidRegistry };
const types = { Bind: [
  { name: "anchor", type: "address" }, { name: "registry", type: "address" }, { name: "agentId", type: "uint256" },
  { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" } ] };
const bindMsg = { anchor, registry: identityRegistry, agentId, nonce: 0, deadline: 1800000000 };
const bindDigest = ethers.TypedDataEncoder.hash(domain, types, bindMsg);
const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
const bindTypehash = ethers.keccak256(ethers.toUtf8Bytes("Bind(address anchor,address registry,uint256 agentId,uint256 nonce,uint256 deadline)"));

// ---- 4. ERC-8419 `account` subject for the anchor -----------------------
const subjectType = ethers.keccak256(ethers.toUtf8Bytes("account"));
const subjectData = abi.encode(["uint256", "address"], [chainId, anchor]);
const subjectKey = ethers.keccak256(abi.encode(["bytes32", "bytes"], [subjectType, subjectData]));

// ---- 5. interfaceId -----------------------------------------------------
const iabi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build", "IAIDRegistry.json"))).abi;
const iface = new ethers.Interface(iabi);
let id = 0n; for (const f of iface.fragments) if (f.type === "function") id ^= BigInt(f.selector);
const interfaceId = "0x" + id.toString(16).padStart(8, "0");

const vectors = {
  description: "ERC-AID test vectors. All hashes are keccak256. Addresses: the ERC-8004 Identity Registry, agent 10387 and the ERC-8419 registry/adapter are real Sepolia deployments; the AID registry, reputation registry and profiler addresses are placeholders.",
  inputs: { chainId, anchor, identityRegistry, agentId, aidRegistry },
  facetTypeKeys,
  aidDocument: { document: doc, jcs, digest: docDigest },
  eip712Bind: { domain, types, message: bindMsg, domainSeparator, bindTypehash, digest: bindDigest },
  erc8419Subject: { subjectType: "account", subjectTypeHash: subjectType, subjectData, subjectKey },
  interfaceId: { IAIDRegistry: interfaceId },
};
fs.writeFileSync(path.join(out, "aid-vectors.json"), JSON.stringify(vectors, null, 2));
fs.writeFileSync(path.join(out, "aid-document.sample.json"), JSON.stringify(doc, null, 2));
console.log("document digest", docDigest, "\nbind digest", bindDigest, "\nsubjectKey", subjectKey, "\ninterfaceId", interfaceId);
