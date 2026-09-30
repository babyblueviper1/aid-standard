# Draft ERC: Agent Identity (AID) — address-anchored identity for live agents, over ERC-8004 + assertion registries

<!-- Post title above. Category: ERCs. Tags: erc, agents, identity, erc-8004 -->

**Draft:** https://github.com/garyyang-finchip/aid-standard/blob/main/ERCS/erc-aid.md
**Filing variant (what goes to ethereum/ERCs):** https://github.com/garyyang-finchip/aid-standard/blob/main/ercs-pr-package/ERCS/erc-9999.md
**Reference implementation, schemas, vectors, resolver, tests:** https://github.com/garyyang-finchip/aid-standard
**ERCs PR:** (to be added)

## One paragraph

Agent Identity (AID) is an identity for autonomous agents whose anchor is a blockchain address. Every address is a *dormant* AID. It becomes *active* when a live agent demonstrably operates behind it: an [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent bound one-to-one to the address, a liveness signal inside a window, and the agent's own on-chain behaviour. AID adds a deliberately thin on-chain layer and composes existing registries for everything else. Around that layer it fixes a deterministic resolution model: an **AID Document** of **facets**, each tagged with a provenance class, a validity window, a digest or commitment, and an access mode, so that anyone holding only an address can derive the agent's state, assemble its profile, and re-verify every facet on chain without trusting an indexer.

## Why

ERC-8004 gives agents a registration and a reputation channel keyed by a token id. It does not say whether the agent is alive, how the registration relates to the address the agent actually transacts from, or how heterogeneous trust signals (feedback, credit scores, audits, on-chain financial behaviour, skill and task history) are assembled into one verifiable, time-bounded picture. Discovery layers (Google's Agentic Resource Discovery, DNS-based agent records) expose a trust slot that expects a DID-like identifier and answer "where is it"; AID is meant to sit in that slot and answer "is it alive, who is it, how has it behaved" with on-chain re-verifiability.

Four observations drive the design:

- **The address is already the join key.** Every event emitted by ERC-8004 registries and by token-bound skill/task contracts carries the acting address. Anchor on the address and an agent's history needs no extra registration — it is derived.
- **Liveness is a property, not a flag.** A registration is a claim made once. AID makes "alive" a four-state machine with a deterministic on-chain part and one explicit off-chain refinement.
- **Trust decays.** Credit and behavioural profiles are only meaningful inside a window; unwindowed credit is rejected at the resolver, not merely discouraged.
- **Financial behaviour is sensitive.** The default for financial facets is a commitment on chain plus predicate proofs, with plaintext only to authorised parties.

## What is on chain (and what is not)

The AID registry stores only anchor-authorised records: **binding** to exactly one ERC-8004 `(identityRegistry, agentId)` (enforced one-to-one in both directions; the anchor must be the agent's `agentWallet` or owner; direct call or EIP-712 `bindWithSig`, ERC-1271 for smart accounts), **heartbeat / liveness window**, **document URI + digest**, **self-declared facet pointers**, and **retirement** (irreversible, releases the binding so a successor can take over the same agent, optional successor pointer). No owner, no upgrade path, two immutable liveness bounds.

States: `DORMANT → ACTIVE ⇄ STALE`, `→ RETIRED`. `state()` is a pure function of on-chain data (binding intact, `ownerOf`/`getAgentWallet` still pointing at the anchor, `lastSeen + window >= now`). A resolver adds exactly one downgrade: registration file `"active": false` → `STALE`. Wallet drift or token burn degrades to `STALE` on the next read with no AID transaction — identity cannot be silently transferred.

Everything else is composed, not duplicated:

| Content | Where it lives |
|---|---|
| registration file, endpoints, agent wallet | ERC-8004 Identity Registry |
| raw per-interaction feedback, open evaluation terms (`tag1`) | ERC-8004 Reputation Registry |
| aggregated credit scores, trust levels, audits, profiler outputs, ZK predicates | an **assertion registry** — the draft specifies the minimum it needs (subject = `account(chainId, anchor)`, `resolve`/`check`, hash-pinned schemes, ATTESTED/PROVED modes, expiry); the reference registry is the [Know-Your-Agent (KYA) Framework draft](https://ethereum-magicians.org/t/erc-8419-know-your-agent-kya-framework/29735), whose interface it matches as written |
| skill / task history | derived from [token-bound skill](https://ethereum-magicians.org/t/erc-8338-token-bound-executable-skills/29005) and [task-tender](https://ethereum-magicians.org/t/erc-8414-token-bound-task-tenders/29597) contract events by role (informative) |

## Facets and provenance

Each facet in the AID Document carries `facetType` (namespaced URI, on-chain key `keccak256`), `provenance`, `issuer`, `validUntil` (mandatory), `digest`, `access`, `resolver`. Provenance is the part I'd most like scrutiny on, because "tamper-proof" means four different things and hiding that distinction is how trust systems get gamed:

| Class | Produced by | Guarantee | Reader obligation |
|---|---|---|---|
| `SELF` | the anchor | integrity only | never present as verified |
| `OBSERVED` | anyone, from chain events under a hash-pinned algorithm | reproducible | recompute or spot-check |
| `ATTESTED` | a third-party issuer | issuer accountability | filter by trusted issuers |
| `PROVED` | a prover against a commitment | cryptographic | verify the proof |

Core facet types: `aid:core/identity/v1`, `aid:core/kya/v1`, `aid:finance/observed/v1` (frequency, volume, direction, counterparty dispersion, leverage, derived intent — default access `ZK`), `aid:behavior/*` (open namespace: runtime, skills, industries, protocols, task traits), `aid:skills/erc8338/v1`, `aid:tasks/erc8414/v1`, `aid:review/erc8004/v1`. Access modes `PUBLIC | GATED | ZK`.

## What is in the repo

- `AIDRegistry.sol` reference implementation (no dependencies; self-contained EIP-712 / low-s ECDSA / ERC-1271), 22 behavioural tests (binding uniqueness both ways, state transitions, wallet drift, burn, facets, `bindWithSig` for EOA and 1271 anchors incl. replay/expiry, retirement + successor, end-to-end resolver)
- JSON Schemas for the AID Document, facet envelope and five core facet content documents
- Test vectors (facetType keys, JCS digest, EIP-712 `Bind` digest, `account` subjectKey, interfaceId `0x72750a54`) and resolver fixtures
- A reference resolver implementing the normative seven-step resolution algorithm, RPC or fixture mode

Sepolia deployment and worked examples (binding the ERC-8004 demo agent used in the KYA thread) are next.

## Questions I'd like feedback on

1. **Anchor = address, binding strictly one-to-one.** ERC-8004 lets one owner hold many agent tokens; AID says an identity that fans out to several tokens is not the identity of *an* agent, and owners with several agents should give each its own wallet or ERC-6551 account. Does anyone see a legitimate case for one anchor ↔ many agents that this breaks?
2. **On-chain / off-chain boundary of "alive".** `state()` ignores the registration file's `active` flag (unreadable on chain) and resolvers apply it as the single downgrade. Is one explicit refinement the right amount, or should the flag be mirrored on chain via `setMetadata`?
3. **Assertion registry as an interface rather than a hard dependency.** The draft specifies the minimum (subject encoding, `resolve`/`check`, pinned schemes, two modes, expiry) instead of requiring a specific registry ERC. Too loose, or the right shape for something several registries could satisfy?
4. **Mandatory `validUntil` and rejection of unwindowed credit.** Strict by design; is there a facet class where an open-ended validity is legitimately needed?
5. **Naming.** No proposal in the ERCs repo uses "Agent Identity" or "AID". A DNS discovery project uses the same acronym for "Agent Identity & Discovery"; the two layers are complementary and designed to point at each other. Objections?
6. **Registry discovery.** One AID registry per chain, deterministic address recommended so a resolver can find it from `chainId` alone. Should the DID method spec (companion, `did:aid:eip155:{chainId}:{address}`) carry the per-chain registry list instead?

Context: this is the fourth piece of a set — ERC-8338 (skill supply side), ERC-8414 (task demand side), ERC-8419 (KYA trust assertions), and now AID as the identity the other three hang off. Happy to be told where it overlaps something I've missed.
