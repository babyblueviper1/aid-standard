Revision after Magicians round 2 (#6, #7):

- **Reference commitment-log profile (informative, §8)**: issuer-owned hash chain with signed heads to declared witnesses and periodic anchoring; log declared by the *issuer* (new AID Document member `commitmentLog`, or the scheme descriptor) provably before `subjectWindow.until`; entries carry an index tag `H(subject ‖ facetType ‖ subjectWindow)` so a resolver can check exactly-one-entry without disclosure; proven time = anchoring time of the first anchored head containing the entry. Normative rule unchanged (anchor- and log-agnostic). `committedAt.log` is now `{ uri, position }`.
- **Security**: takeover and successor never merge histories (either direction).
- Assets: schemas, reference resolver (`exclusivity`: unique / duplicate / missing / undeclared / unchecked), vectors, new fixture `log-exclusivity.json`. Test suite 28 → 29.
