# add-erc-aid — branch & PR checklist

Same procedure as `add-erc-kya` (PR #2012). The fork's `master` is reserved for PR #1879 (ERC-8338): never commit there.

## 0. Preconditions

- [ ] `ERCS/erc-9999.md` in this package is the **filing variant**: self-contained, `requires: 155, 165, 712, 1271, 8004`, no reference by number to the three still-open proposals (KYA Framework #2012, Skills #1879, Task Tenders #2005). It is generated from the source text by `scripts/make-filing-variant.py`; regenerate after any edit to `ERCS/erc-aid.md`.
- [ ] Post the Magicians thread first and put its URL into `discussions-to` before uploading — eipw rejects a placeholder URL (`preamble-discussions-to`). Thread title: `ERC-9999: Agent Identity (AID)` (renamed after a number is assigned). The thread MAY link the KYA Framework thread and the aid-standard repo freely; Magicians has no lint.
- [ ] After #2012 (and #1879 / #2005) merge: open a follow-up PR that restores the numbered references and adds `requires: 8419` (the source text `ERCS/erc-aid.md` already has them).

## 1. Branch (GitHub web UI, in the fork garyyang-finchip/ERCs)

- [ ] Sync the fork's view of upstream: on the fork page choose "Sync fork" only if it targets a branch other than `master` — otherwise skip; the branch below is cut from **upstream** directly.
- [ ] Create branch `add-erc-aid` from `ethereum/ERCs:master` (branch selector → type `add-erc-aid` → "Create branch from ethereum:master"). Verify the new branch shows "This branch is 0 commits ahead of ethereum:master" before uploading anything.

## 2. Upload (exact paths)

```
ERCS/erc-9999.md
assets/erc-9999/contracts/AIDRegistry.sol
assets/erc-9999/contracts/interfaces/IAIDRegistry.sol
assets/erc-9999/contracts/interfaces/IERC8004Identity.sol
assets/erc-9999/contracts/mocks/MockIdentityRegistry8004.sol
assets/erc-9999/schemas/aid-document.schema.json
assets/erc-9999/schemas/facet.schema.json
assets/erc-9999/schemas/facets/behavior-v1.schema.json
assets/erc-9999/schemas/facets/finance-observed-v1.schema.json
assets/erc-9999/schemas/facets/review-erc8004-v1.schema.json
assets/erc-9999/schemas/facets/skills-erc8338-v1.schema.json
assets/erc-9999/schemas/facets/tasks-erc8414-v1.schema.json
assets/erc-9999/tools/jcs.js
assets/erc-9999/tools/aid-resolve/resolve.js
assets/erc-9999/vectors/aid-vectors.json
assets/erc-9999/vectors/aid-document.sample.json
assets/erc-9999/vectors/fixtures/active.json
assets/erc-9999/vectors/fixtures/active-flag-false.json
assets/erc-9999/vectors/fixtures/retired.json
assets/erc-9999/vectors/fixtures/bad-digest.json
```

Commit message: `Add ERC: Agent Identity (AID)`.

## 3. Open the PR

- [ ] base: `ethereum/ERCs` `master` ← head: `garyyang-finchip/ERCs` `add-erc-aid`
- [ ] Title: `Add ERC: Agent Identity (AID)`
- [ ] Body: PR-DESCRIPTION.md
- [ ] Expect the editor bot to assign a number and ask to rename `erc-9999.md` → `erc-NNNN.md`, update `eip:` and every `assets/erc-9999/` path (a `sed` of `9999` → `NNNN` across the branch is sufficient; the vectors file contains no `9999`).

## 4. After a number is assigned

- [ ] Rename file + paths, patch `discussions-to`, push to the same branch.
- [ ] Rename the Magicians thread to `ERC-NNNN: Agent Identity (AID)`.
- [ ] Update `aid-standard` README and memo with the number.
