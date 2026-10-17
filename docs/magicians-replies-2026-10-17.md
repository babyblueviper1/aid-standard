# ERC-8434 Magicians — reply to #24 (babyblueviper1, Sepolia replay + commitment-log example offer), 2026-10-17

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805

## Reply to #24

@babyblueviper1 Thanks for the independent replay; having both results reproduced from a fresh clone is exactly the check the deployment needed, and the detail you confirmed — A's interval closed by the ERC-8004 transfer, not by the later `Unbound` — is the one the resolver exists to get right.

Yes, please send the PR. Scope, so that it lands in one round:

- Data only, under a new `examples/sepolia-commitment-log/` directory: the recorded JSON-RPC responses pinned to one block, the resolver output per anchor, the OTS fixture with its `expect` block, and a short README with the commands. Nothing under `ERCS/`, `ercs-pr-package/` or `assets/`. The two scripts now take a bundle: `node scripts/sepolia-replay.js --manifest examples/sepolia-commitment-log/manifest.json` and `node scripts/ots-timing-check.js examples/sepolia-commitment-log/ots-fixture.json`, so no code is needed on your side.
- The log has to be the issuer's, on chain: declare `commitmentLog` in your own anchor's AID Document with `setDocumentURI` on Sepolia, with `declaredAt` before the facets' `subjectWindow.until`, entries tagged `keccak256(abi.encode(subject, facetType, from, until))` with the subject being the reference anchor's CAIP-10, and the head OTS-anchored. That is what makes `exclusivity` and the proven time checkable rather than asserted.
- For the late supersession to exercise the rule, the superseded facet should be `final` and the superseding entry's head must itself be anchored, so the resolver reports `supersessionTiming: not-before-outcome` and `reversedAfterOutcome: true` rather than `unknown`.
- The subject side: the resolver classifies a facet only if the subject's Document lists it, so send the facet envelopes first; the reference anchor will add them to its Document, and the replay is then fully on chain. If that cannot happen in time, the bundle can carry the subject Document in fixture form, labelled as such.

I will re-run both commands from a fresh clone before merging and reference the bundle from the README beside the replay, with credit. That closes the gap you named: §8 and the supersession-timing rule will then have a live Sepolia case, not only the vectors.

## Decisions

| # | Decision |
|---|---|
| 1 | Accept the data-only PR under `examples/sepolia-commitment-log/`; no change to `ERCS/`, `ercs-pr-package/`, `assets/`, `tools/`. |
| 2 | Repository side prepared in advance so the PR stays data-only: `scripts/sepolia-replay.js --manifest <bundle>/manifest.json` and `scripts/ots-timing-check.js <fixture>` accept external bundles (the default behaviour is unchanged; `npm test` 33/33, `ots-check` ALL PASS). |
| 3 | The commitment log must be declared on chain by the issuer (his anchor's AID Document on Sepolia); the superseded facet `final` and the superseding head anchored, so the R2.8 rule fires. |
| 4 | The reference anchor B lists his facet envelopes in its Document (B's key is still held in the deployment session); fallback: subject Document in fixture form, labelled. |
| 5 | Merge only after a fresh-clone re-run of both commands; README gets one line pointing at the bundle, with credit. No ERC text change now — a single "reference deployment covers …" sentence goes into #2044 together with predge-ai's vector later. |
| 6 | Co-authorship not raised in #24 and not addressed in this reply. |
