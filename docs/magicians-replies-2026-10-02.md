# ERC-8434 Magicians replies — round 2 (2026-10-02)

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805 · PR: ethereum/ERCs#2044

Post as a reply to #7 (babyblueviper1). Section numbers are those of the PR text (`erc-8434.md`): §8 Provenance / timing.

---

## Reply to #7 (babyblueviper1) — issuer-owned commitment log

@babyblueviper1 That is a better shape than a global log: it reduces exclusivity to non-equivocation of one head, which a few independent witnesses give cheaply. I've added it to §8 as an informative *reference commitment-log profile* — issuer-owned hash chain, signed heads published to declared witnesses, periodic anchoring, resolver enumerates up to an anchored head — with the normative rule staying anchor- and log-agnostic.

Three details the profile pins down, because without them the hole you closed reopens:

1. **The issuer declares the log, not the subject.** A log named in the *subject's* AID Document doesn't stop an issuer from keeping a second one. Every issuer is itself an address — a dormant AID at least — so the natural place is the issuer's own AID Document (new top-level member `commitmentLog`) or, for facets issued through an assertion registry, the scheme descriptor pinned by `schemeHash`. The declaration has to be provably earlier than `subjectWindow.until`, otherwise an issuer could declare a cleaned log after the fact. A commitment in any log not declared that way is not read as pre-outcome.
2. **Enumerable without disclosure.** To enumerate per `(issuer, subject, facetType, subjectWindow)` the entries need those keys, not just `content_hash`. Each entry carries a deterministic index tag, `H(subject ‖ facetType ‖ subjectWindow)`, next to the content commitment, so a resolver can check there is exactly one entry per tag up to the anchored head without seeing `GATED` or `ZK` content. `committedAt.log` is now `{ uri, position }`.
3. **Which time is proven.** The proven time of a facet is the anchoring time of the first anchored head that includes its entry, not anything the entry states about itself; and the witness set, with how a resolver queries it, is declared together with the log — otherwise non-equivocation can't actually be checked.

The reference resolver now applies the check when it can read the declared log: `pre-outcome` is kept only with exactly one matching entry (`exclusivity: unique`); `duplicate`, `missing` or `undeclared` downgrade to `integrity-only`; no log access reports `unchecked` without downgrading. There's a fixture covering the three outcomes.

The PR on aid-standard is welcome — verifier, twins and the different-digest negative is the right set. I'll review it there; one thing to document in it is that the pinned header is the verifier's trust root. The verifier stays an optional plug-in in the repository rather than part of the ERC assets, so the normative text doesn't depend on any one anchor.

---

## Decisions taken

| # | Decision |
|---|---|
| 1 | Issuer-owned hash chain + witnesses + periodic anchoring adopted as an **informative** profile in §8 (PR text) / §7 (source). Normative rule unchanged: anchor- and log-agnostic. |
| 2 | Log declared by the **issuer** (AID Document `commitmentLog`, or scheme descriptor), provably before `subjectWindow.until`. |
| 3 | Entry index tag `H(subject ‖ facetType ‖ subjectWindow)`; reference implementation uses `keccak256(abi.encode(string subject, string facetType, uint64 from, uint64 until))`. |
| 4 | Proven time = anchoring time of the first anchored head containing the entry; witness set declared with the log. |
| 5 | OTS verifier: optional plug-in in aid-standard only, not in ERC assets. |
| 6 | Spec revision pushed to #2044 now (the verifier PR does not touch the ERC text, so there is nothing to wait for). |
| 7 | No endorsement of invinoveritas data in the thread. |
| 8 | From the #6 exchange: "takeover and successor do not merge histories" made explicit in Security Considerations. |
