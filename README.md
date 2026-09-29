# aid-standard — Agent Identity (AID)

Draft ERC: **Agent Identity (AID)** — address-anchored identity for live agents, layered on ERC-8004 (identity, feedback) and ERC-8419 (KYA / ZK assertions), compatible with ERC-8338 (skills) and ERC-8414 (tasks).

> Any address is a dormant AID. It becomes active when a live agent demonstrably operates behind it.

Status: **round 2 — full draft text, reference implementation, schemas, vectors, resolver.** Not yet filed to `ethereum/ERCs`; not yet deployed to Sepolia (round 3).

## Layout

```
ERCS/erc-aid.md                       EIP-1 formatted draft (placeholder number 9999)
docs/AID-design-memo-zh.md            中文设计备忘录 v0.2（决策记录 + R2 交付说明）
assets/erc-aid/
  contracts/AIDRegistry.sol           reference registry (no owner, no upgrade, self-contained EIP-712/1271)
  contracts/interfaces/               IAIDRegistry.sol, IERC8004Identity.sol
  contracts/mocks/                    MockIdentityRegistry8004.sol, MockERC1271Wallet
  schemas/                            aid-document, facet envelope, facets/*-v1 content schemas
  vectors/aid-vectors.json            facetType keys, JCS digest, EIP-712 Bind digest, 8419 subjectKey, interfaceId
  vectors/aid-document.sample.json    sample AID Document
  vectors/fixtures/                   resolver fixtures (active, active-flag-false, retired, bad-digest)
tools/jcs.js                          RFC 8785 canonicalisation used for document digests
tools/aid-resolve/resolve.js          reference resolver (RPC or fixture mode)
scripts/compile.js                    solc-js compile → build/*.json
scripts/vectors.js · fixtures.js      regenerate vectors and fixtures
test/run.js                           behavioural tests on a local Hardhat chain (22 cases)
```

## Build & test

```bash
npm install
npm run compile      # solc 0.8.28 via solc-js, no network needed
npm test             # deploys to in-process Hardhat network and runs test/run.js
npm run vectors      # regenerates assets/erc-aid/vectors
```

Resolve an anchor:

```bash
node tools/aid-resolve/resolve.js --rpc https://rpc.sepolia.org --registry <AIDRegistry> --anchor <address>
node tools/aid-resolve/resolve.js --fixture assets/erc-aid/vectors/fixtures/active.json --now 1791000000
```

## Design summary

- **Anchor** = `(eip155, chainId, address)`; CAIP-10 string `eip155:{chainId}:{address}`; DID form `did:aid:eip155:{chainId}:{address}` (companion DID method).
- **Binding** to ERC-8004 is strictly one-to-one (anchor ↔ `(identityRegistry, agentId)`), anchor-authorised (direct or EIP-712 `bindWithSig`, EIP-1271 for smart accounts), requiring `agentWallet == anchor` or `ownerOf == anchor`. Recommended anchor: the agent wallet.
- **States**: `DORMANT → ACTIVE ⇄ STALE`, `→ RETIRED` (irreversible, releases the binding, optional successor). On-chain `state()` is fully deterministic; resolvers downgrade with the 8004 registration file's `active` flag.
- **Thin layer**: the registry stores only anchor-authorised records (binding, heartbeat, liveness window, document URI, self facets, retirement). Credit, KYA, audits and profiler outputs are ERC-8419 assertions with subject type `account`; raw feedback is ERC-8004 Reputation; skill/task history is derived from ERC-8338/8414 events.
- **Facets** carry provenance (`SELF | OBSERVED | ATTESTED | PROVED`), a mandatory `validUntil`, a digest/commitment and an access mode (`PUBLIC | GATED | ZK`). Financial-behaviour facets default to commitment + ZK predicates.
- `IAIDRegistry` interfaceId: `0x72750a54`.

## Process rules

- ERCs PR branch: `add-erc-aid`, cut from `ethereum/ERCs` **upstream** master. Never from the fork's master (reserved for PR #1879 / ERC-8338).
- Rounds: R1 memo + skeleton (done) → R2 full text + contracts + schemas + vectors + resolver (done) → R3 Sepolia deployment + worked examples + Magicians thread → R4 ERCs PR + DID method companion.
- `requires: 8419` means the ERC-8419 PR (#2012) should be merged as Draft before AID is filed, or the reference is downgraded to prose at filing time (see memo, open question 8).

## Related

- ERC-8004 Trustless Agents · ERC-8419 Know-Your-Agent (KYA) Framework · ERC-8338 Token-Bound Executable Skills · ERC-8414 Token-Bound Task Tenders
- Sibling repos: `kya-standard`, `task-token-standard`

## License

CC0-1.0
