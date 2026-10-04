Revision after Magicians round 3 (#9):

- **Anchor clock tolerance (§8)**: `pre-outcome` requires `t + tolerance(anchor) < subjectWindow.until`; tolerances: `block` 12 s (one post-merge slot), `ots` 7200 s (Bitcoin header-time bound), `rfc3161` the token's stated accuracy (reference resolver default 60 s when absent). A `subjectWindow.until` inside the tolerance band is reported `integrity-only` with the reason.
- Assets: reference resolver (`ANCHOR_TOLERANCE`), vectors (`timing.json` gains a within-tolerance negative), fixtures regenerated.
