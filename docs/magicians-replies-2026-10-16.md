# ERC-8434 Magicians — Sepolia reference deployment (2026-10-16)

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805 · PR: ethereum/ERCs#2044

Post as a thread-level reply after the R3 commit on #2044 is green.

---

## Reply (thread-level)

The reference registry is now on Sepolia, with a worked example that exercises the rules this thread shaped.

- `AIDRegistry`: `0x01C05738eebD20DC80bBb9Fa1Ceb1165af8dA00F` (Sourcify exact match, creation and runtime), bound to the official ERC-8004 Identity Registry `0x8004A818BFB912233c491871b3d84c89A494BD9e`.
- Agent `11039`: anchor A registers and binds (`ACTIVE`); the agent is transferred on ERC-8004, so A turns `STALE` with no AID transaction at all; the new owner B binds and takes over the stale binding (`Unbound(A)`, `Bound(B)`); A retires with B as successor.
- The reference resolver reconstructs the authority intervals from `Bound`/`Unbound` plus ERC-8004 `Transfer`/`MetadataSet(agentWallet)`: A holds `[bind, transfer)` — closed by the transfer, not by the later `Unbound` — and B holds `[takeover, ∞)`. A's own identity facet, observed before its interval began, is reported *not attributable*; B's is current and in-interval.
- Everything the resolver read is recorded at block 11921903, so `node scripts/sepolia-replay.js` in aid-standard reproduces the run offline; `--live <rpc>` runs it against the chain.

Record: `deployments/sepolia.json`, `deployments/sepolia/` and `docs/sepolia-worked-example.md` in https://github.com/garyyang-finchip/aid-standard. #2044 gains one sentence in Reference Implementation pointing at the deployment.

Two things worth knowing if you try it: Sepolia is on the next-fork gas schedule (the 8.8 KB registry took 13.4 M gas to deploy), and it now emits ETH-transfer logs from `0xff…fe`, which the resolver ignores because it filters ERC-8004 events by registry address.

---

## Decisions

| # | Decision |
|---|---|
| 1 | Both anchor keys are session-only and discarded; the example needs no upkeep (B turns `STALE` after 90 days by design). |
| 2 | Registration file and AID Documents are `data:` URIs so the example is self-contained on chain. |
| 3 | B's Document was re-published with the identity facet observed at `boundAt`; A's stays as a demonstration of the attribution rule. |
| 4 | ERC text gets one informative sentence (Reference Implementation); no normative change. |
