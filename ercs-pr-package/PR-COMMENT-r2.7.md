Revision after Magicians round 4 (#11):

- **Supersession (§6, §11)**: optional `supersedes` on the facet envelope (digest of an earlier facet by the same issuer); a superseded facet is history even inside its window, marked `supersededBy`; cross-issuer supersession is ignored and reported.
- **Finality (§6)**: optional `finality: provisional | final` (absent = final); domain state machines belong to facet-type content schemas; a provisional facet may be current but is never presented as final.
- **Issuer-side discovery (§8)**: a supersession counts only when it appears in the issuer's declared commitment log under the same tag; the exclusivity rule treats an explicit supersession chain as legitimate and only the latest unsuperseded entry can be current.
- Assets: facet schema, reference resolver, three new fixtures (`supersession-chain`, `supersession-hidden`, `supersession-cross-issuer`). Test suite 29 → 30.
