# ERC-8434 Magicians replies — round 3 (2026-10-05)

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805 · PR: ethereum/ERCs#2044 · aid-standard PR #1

Post the review comment on aid-standard#1 first; post the thread reply to #9 after #1 is merged.

---

## Review comment on aid-standard#1 (request changes)

Thanks — the verifier is clean, the six mutations are exactly the right set, and I reproduced everything locally: `node scripts/ots-timing-check.js` 9/9, the full suite with your files overlaid 29/29, the resolver without the plug-in reports `integrity-only` for all three facets without throwing, and `sha256d(blockHeader)` matches `blockHash`. Two changes before I merge, both about where things live rather than what they do:

1. **Drop the `ercs-pr-package/` mirror.** `ercs-pr-package/` is the file set that goes to ethereum/ERCs, and the thread already says the verifier stays an optional plug-in in this repository rather than part of the ERC assets. Keeping the mirror would pull it into PR #2044 on the next sync. `tools/aid-resolve/verifiers/ots.js` and `assets/erc-aid/vectors/fixtures/ots-*` are the right homes.
2. **Keep the fixture content-neutral.** The proof is over a digest, and the digest is all the verifier needs, so `ots-facet-content.json` and the ledger URL in `OTS-README.md` / `scripts/fixtures-ots.js` can go. Describe the digest as "a third-party document stamped on 2026-10-01; its content is not part of this repository" — the reference implementation shouldn't carry any issuer's branding, including yours.

I'll squash-merge with a neutral message once those are in. Separately: your precision point from the thread is right and not `ots`-specific, so the next spec revision states a per-anchor clock tolerance (block 12 s, ots 7200 s, rfc3161 stated accuracy) and the resolver subtracts it before deciding `pre-outcome`; a within-tolerance negative is added to the vectors. That lands on top of your PR, so no action needed on your side.

---

## Reply to #9 (babyblueviper1) — post after #1 is merged

@babyblueviper1 Merged aid-standard#1 — thanks for the real proof, the six mutations and the trust-root note. Two changes on merge: the verifier and its fixtures live only in the repository (`tools/`, `assets/erc-aid/`), not in `ercs-pr-package`, so the ERC assets stay anchor-agnostic; and the fixture carries the stamped digest without the underlying document or links, so the reference implementation stays issuer-neutral.

On precision: agreed, and it isn't specific to `ots`. Every anchor's clock has a tolerance — 12 seconds (one slot) for an Ethereum block, roughly two hours for a Bitcoin header, the stated accuracy for an RFC 3161 token — so §8 now says a resolver reports `pre-outcome` only when the proven time plus the anchor's tolerance is earlier than `subjectWindow.until`, and `integrity-only` with the reason otherwise. The reference resolver applies the same table, and there is a within-tolerance negative in the vectors.

---

## Decisions

| # | Decision |
|---|---|
| 1 | PR #1: merge after two changes (no `ercs-pr-package` mirror; content-neutral fixture, no issuer links); squash with message `Add optional OpenTimestamps committedAt verifier and Bitcoin-anchored timing fixture (contributed by @babyblueviper1)`. |
| 2 | Clock tolerance: adopted as a general per-anchor rule in the spec (§8 PR / §7 source), written by the author, not by the contributor. |
| 3 | Resolver: `ANCHOR_TOLERANCE` (block 12, ots 7200, rfc3161 `proof.accuracySeconds` or 60); within-tolerance negative in test suite and `timing.json`. |
| 4 | Spec revision goes to #2044 as a content commit; aid-standard gets the same plus `ots-check` script already in `package.json`. |
| 5 | No endorsement of invinoveritas data in thread or repo. |
