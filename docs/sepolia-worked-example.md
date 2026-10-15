# ERC-8434 on Sepolia — reference deployment and worked example

Deployed 2026-10-15. Addresses, transaction hashes and the pinned resolver run are recorded in [`deployments/sepolia.json`](../deployments/sepolia.json); the resolver's inputs and outputs are under [`deployments/sepolia/`](../deployments/sepolia/).

| Item | Value |
|---|---|
| `AIDRegistry` | `0x01C05738eebD20DC80bBb9Fa1Ceb1165af8dA00F` (Sourcify exact match, creation + runtime) |
| Constructor | `defaultLivenessWindow = 7776000` (90 d), `maxLivenessWindow = 31536000` (365 d) |
| ERC-8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` (official Sepolia deployment) |
| Demo agent | `agentId 11039` |
| Anchor A (first owner) | `0x7B21E11Cd89826cB76784d6f780514432f34dAAD` |
| Anchor B (second owner) | `0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2` |
| Pinned block for the resolver run | 11921903 (timestamp 1792085136) |

Both anchor keys were generated for the deployment session only and are not kept. Nothing in the example needs upkeep: B stops heartbeating, so B turns `STALE` 90 days after the last heartbeat, which is the liveness rule doing its job.

## Timeline

| # | Block | Actor | Action | Effect on AID state |
|---|---|---|---|---|
| 1 | 11921818 | A | deploy `AIDRegistry` | — |
| 2 | 11921822 | A | ERC-8004 `register(agentURI)` → agent 11039; `agentWallet` defaults to A | A is `DORMANT` (no binding yet) |
| 3 | 11921831 | A | `bind(IdentityRegistry, 11039)` | A is `ACTIVE` |
| 4 | 11921831 | A | `setFacet(aid:core/identity/v1, keccak(JCS(registration file)), …)` | on-chain SELF facet |
| 5 | 11921837 | A | `setDocumentURI(data: AID Document, keccak(JCS(document)))`, `heartbeat()`, fund B | — |
| 6 | 11921841 | A | ERC-8004 `transferFrom(A, B, 11039)` — the registry clears `agentWallet` (`MetadataSet`) and emits `Transfer` | A is `STALE` **without any AID transaction**: `state()` re-evaluates the predicate |
| 7 | 11921848 | B | `bind(IdentityRegistry, 11039)` | takeover (§3): `Unbound(A)` then `Bound(B)`; A is `DORMANT`, B is `ACTIVE` |
| 8 | 11921849–50 | B | `heartbeat()`, `setDocumentURI(…)` | — |
| 9 | 11921851 | A | `retire(B)` | A is `RETIRED`, successor B |
| 10 | 11921903 | B | `setDocumentURI(…)` again, identity facet now observed at B's `boundAt` | the live Document |

The registration file and both AID Documents are `data:application/json;base64` URIs, so the example is self-contained on chain; the decoded files are in `deployments/sepolia/`.

## What the reference resolver reports

`node scripts/sepolia-replay.js` runs `tools/aid-resolve/resolve.js` in RPC mode against the JSON-RPC responses recorded at block 11921903 and checks the output against `resolved-A.json` / `resolved-B.json`. The same command with `--live <sepolia-rpc>` resolves against the chain.

**Anchor B** — `onChainState: ACTIVE`, `resolvedState: ACTIVE` (registration file `active: true`), binding `(0x8004…BD9e, 11039)` bound at 1792084476, one open authority interval `[1792084476, ∞)` reconstructed from `Bound(B)` and the ERC-8004 `Transfer`/`MetadataSet(agentWallet)` history. Its `aid:core/identity/v1` facet is current, `attribution: in-interval`, `provenance: SELF` and therefore never `verified`, `timing: none` (no `committedAt`).

**Anchor A** — `onChainState: RETIRED`, successor B; one closed authority interval `[1792084272, 1792084392)`: it opens at `Bound(A)` and closes at the transfer, not at the later `Unbound(A)`, because the predicate failed first (§3, authority intervals). A's identity facet is reported **not attributable**: its `observedAt` is the registration time (1792084164), which is before A's interval began. That is the rule working as specified — evidence keyed by `agentId` counts only inside an authority interval — and it is why B's Document was re-published with `observedAt = boundAt` in step 10.

## Operational notes

- Gas: Sepolia runs the next-fork gas schedule, so every transaction cost several times its local Hardhat figure (the 8.8 KB registry deployment used 13.39 M gas). Limits were taken from live `eth_estimateGas`.
- Sepolia now emits ETH-transfer logs from `0xff…fe` (the plain transfer in step 5 carries one). The resolver filters ERC-8004 events by registry address, so these do not interfere with interval reconstruction.
- The registration file is a `data:` URI; ERC-8004 allows it, and the resolver's `loadURI` decodes it without network access.
