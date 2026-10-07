# ERC-8434 Magicians replies — round 4 (2026-10-07)

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805 · PR: ethereum/ERCs#2044

Two replies. Post the #9 reply first (its preconditions — aid-standard#1 merged, tolerance rule in #2044 — are met), then the #11 reply.

---

## Reply to #9 (babyblueviper1) — unchanged from round 3

@babyblueviper1 Merged aid-standard#1 — thanks for the real proof, the six mutations and the trust-root note. Two changes on merge: the verifier and its fixtures live only in the repository (`tools/`, `assets/erc-aid/`), not in `ercs-pr-package`, so the ERC assets stay anchor-agnostic; and the fixture carries the stamped digest without the underlying document or links, so the reference implementation stays issuer-neutral.

On precision: agreed, and it isn't specific to `ots`. Every anchor's clock has a tolerance — 12 seconds (one slot) for an Ethereum block, roughly two hours for a Bitcoin header, the stated accuracy for an RFC 3161 token — so §8 now says a resolver reports `pre-outcome` only when the proven time plus the anchor's tolerance is earlier than `subjectWindow.until`, and `integrity-only` with the reason otherwise. The reference resolver applies the same table, and there is a within-tolerance negative in the vectors.

---

## Reply to #11 (predge-ai) — supersession and finality

@predge-ai Agreed that this is a real gap. A facet's digest and window say nothing about whether its issuer later replaced it, so a resolver following the current rules reads an overturned answer as current. Assertions issued through an assertion registry are already covered — §5 has `resolve`/`check` ignore superseded and revoked assertions — but facets carried in the AID Document itself had no way to say it.

I've taken your proposal in two layers:

1. **Supersession is generic, not outcome-specific.** Audits get reissued, scores get updated, reviews get corrected. So the envelope gains an optional `supersedes` (the digest of the facet it replaces) for any facet type, and the resolver rule is yours: a superseded facet MUST NOT be read as current even inside its window; it stays enumerable as history, marked with what superseded it.
2. **Finality is domain-specific.** `proposed / disputed / final` is the shape of an optimistic-oracle flow; another oracle or another domain will have different states. The core envelope only carries `finality: provisional | final` (absent = final), with the state machine itself defined by the facet type's content schema. A resolver may list a provisional facet as current but MUST NOT present it as final. That also removes the window dilemma: a provisional answer can carry a short `validUntil` and be superseded by the final one, instead of the window having to guess how long a dispute will run.

One thing the proposal needs in order to hold: **supersession has to be discoverable from the issuer's side, not the subject's.** The AID Document is maintained by the anchor, and an anchor whose favourable answer was overturned has every reason to keep presenting the old facet and leave the new one out. So a supersession only counts if it comes from the same issuer and appears in that issuer's declared commitment log (§8) under the same index tag, with `supersedes` pointing at the earlier entry; a resolver walking the log sees it whether or not the subject presents the replacement. That also refines the exclusivity rule: two entries under one tag are still equivocation, unless the later one explicitly supersedes the earlier, in which case the resolver follows the chain and only the latest unsuperseded entry can be current. A "supersession" by a different issuer isn't one.

This is now in #2044: `supersedes` and `finality` in the envelope (§6), the resolver rule in §11, the supersession-aware exclusivity rule in §8, with vectors for the three cases — a normal supersession chain, a subject presenting only the superseded facet while the issuer's log shows the replacement, and a cross-issuer supersession being refused.

---

## Decisions

| # | Decision |
|---|---|
| a | Generic `supersedes` on the envelope; superseded facet → history with `supersededBy`. Adopted. |
| b | Core carries only `finality: provisional | final` (absent = final); domain state machines stay in facet-type schemas. Adopted. |
| c | Supersession counts only from the same issuer and must appear in the issuer's declared log under the same tag. Adopted. |
| d | Exclusivity: a later entry with `supersedes` is a chain, not a duplicate; only the latest unsuperseded entry can be current. Adopted. |
| e | Landed now as its own content commit (R2.7), after the round-3 commit already on #2044. |
| — | No endorsement of Predge data or product; the dispute-time figures are not cited. |
