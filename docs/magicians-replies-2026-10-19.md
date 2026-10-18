# ERC-8434 Magicians — reply to #27 (babyblueviper1: commitment-log entries anchored), 2026-10-19

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805

## Reply to #27

@babyblueviper1 Both envelopes check out against the log: the tag equals the resolver's `logTag` for the reference anchor, the head chain follows `keccak256(tag, content, supersedes, prev)`, both head signatures recover to your anchor, the two `ots` proofs over the heads verify to 1792283781 and 1792315510 and the two over the facet digests to 1792284238 and 1792316888, and your Document on the registry declares the log with `declaredAt` before `subjectWindow.until`. Entry 1 is pre-outcome by the `ots` tolerance, entry 2's head is after `until`, both are `final`: exactly the case the rule is for. Run against B's new Document, the reference resolver reports facet 1 as history with `supersessionTiming: not-before-outcome` and `reversedAfterOutcome: true`, and facet 2 as current, `integrity-only`.

B's Document now lists both envelopes: `setDocumentURI` in Sepolia tx `0x9ef33beab91cb7d124554fb9846b55a28284e16d9930ae88340defc8dd17eb85`, block 11944210 (heartbeat in `0x4ac6259fc1d3fe79c7d4fc16f50a4f978d22314a2a684a93b7ef47be11ba5fe4`, block 11944211). Pin your recording to block 11944210 or later and send the PR; I'll re-run both commands from a fresh clone before merging.

One finding on our side, not yours. Your content digests are `sha256` of the canonical content; the ERC text fixed `keccak256` for the AID Document digest but never said which hash the facet `digest` uses — the schema description assumed `keccak256`, the text did not state it. Rather than ask you to re-anchor, the envelope gains an optional `digestAlg` (`keccak256 | sha256`, absent = `keccak256`), so B's Document carries your envelopes with `"digestAlg": "sha256"` and nothing in your log changes. That goes into the next revision of #2044 with the schema, the resolver's `verifyContent`, and a line in the acknowledgements; please add the same member to the two envelopes in your bundle.

## Decisions

| # | Decision |
|---|---|
| 1 | All of his data verified offline with the repository's own tools before anything was published (tag, head rule, head signatures, four OTS proofs, on-chain issuer Document and its digest, envelope schema). |
| 2 | Facet content digest algorithm was an unstated default in the ERC; fixed as optional envelope member `digestAlg` (`keccak256 | sha256`, default `keccak256`) in R2.9 rather than requiring a re-anchored log. Acknowledgement line added. |
| 3 | B's Document re-published on chain as a `data:` URI (13.3 KB, 42.8 M gas) to keep the example self-contained; B funded with 0.015 ETH from A first. |
| 4 | The issuer's content type and log version strings carry his product name; they stay in his repository. His bundle must carry the log in the resolver's `logEntries` form and reference facet contents by URI, so no copies enter aid-standard. |
| 5 | Review of his PR: fresh-clone `node scripts/sepolia-replay.js --manifest examples/<bundle>/manifest.json` and `node scripts/ots-timing-check.js examples/<bundle>/<fixture>.json`; envelopes carry `digestAlg`; data only. README line + credit after merge. |
