# add-erc-aid — branch & PR checklist

Same procedure as `add-erc-kya` (PR #2012). The fork's `master` is reserved for PR #1879 (ERC-8338): never commit there.

## 0. Preconditions

- [ ] `ERCS/erc-8434.md` in this package is the **filing variant**: self-contained, `requires: 155, 165, 712, 1271, 8004`, no reference by number to the three still-open proposals (KYA Framework #2012, Skills #1879, Task Tenders #2005). It is generated from the source text by `scripts/make-filing-variant.py`; regenerate after any edit to `ERCS/erc-aid.md`.
- [ ] Post the Magicians thread first and put its URL into `discussions-to` before uploading — eipw rejects a placeholder URL (`preamble-discussions-to`). Thread title: `ERC-9999: Agent Identity (AID)` (renamed after a number is assigned). The thread MAY link the KYA Framework thread and the aid-standard repo freely; Magicians has no lint.
- [ ] After #2012 (and #1879 / #2005) merge: open a follow-up PR that restores the numbered references and adds `requires: 8419` (the source text `ERCS/erc-aid.md` already has them).

## 1. Branch (GitHub web UI, in the fork garyyang-finchip/ERCs)

- [ ] Sync the fork's view of upstream: on the fork page choose "Sync fork" only if it targets a branch other than `master` — otherwise skip; the branch below is cut from **upstream** directly.
- [ ] Create branch `add-erc-aid` from `ethereum/ERCs:master` (branch selector → type `add-erc-aid` → "Create branch from ethereum:master"). Verify the new branch shows "This branch is 0 commits ahead of ethereum:master" before uploading anything.

## 2. Upload (exact paths)

```
ERCS/erc-8434.md
assets/erc-8434/contracts/AIDRegistry.sol
assets/erc-8434/contracts/interfaces/IAIDRegistry.sol
assets/erc-8434/contracts/interfaces/IERC8004Identity.sol
assets/erc-8434/contracts/mocks/MockIdentityRegistry8004.sol
assets/erc-8434/schemas/aid-document.schema.json
assets/erc-8434/schemas/facet.schema.json
assets/erc-8434/schemas/facets/behavior-v1.schema.json
assets/erc-8434/schemas/facets/finance-observed-v1.schema.json
assets/erc-8434/schemas/facets/review-erc8004-v1.schema.json
assets/erc-8434/schemas/facets/skills-erc8338-v1.schema.json
assets/erc-8434/schemas/facets/tasks-erc8414-v1.schema.json
assets/erc-8434/tools/jcs.js
assets/erc-8434/tools/aid-resolve/resolve.js
assets/erc-8434/vectors/aid-vectors.json
assets/erc-8434/vectors/aid-document.sample.json
assets/erc-8434/vectors/fixtures/active.json
assets/erc-8434/vectors/fixtures/active-flag-false.json
assets/erc-8434/vectors/fixtures/retired.json
assets/erc-8434/vectors/fixtures/bad-digest.json
```

Commit message: `Add ERC: Agent Identity (AID)`.

## 3. Open the PR

- [ ] base: `ethereum/ERCs` `master` ← head: `garyyang-finchip/ERCs` `add-erc-aid`
- [ ] Title: `Add ERC: Agent Identity (AID)`
- [ ] Body: PR-DESCRIPTION.md
- [ ] Asset links inside the ERC text MUST use `../assets/eip-8434/...` even though the directory is `assets/erc-8434/`: the ERCs site build renames `assets/erc-*` → `assets/eip-*` (see `.github/workflows/ci.yml`, "Merge Repos"). Links with `erc-` 404 in HTMLProofer (PR #2044 run 2, and the ERC-8414 incident).
- [x] Number assigned: **ERC-8434** (2026-10-01). Package regenerated with `eip: 8434`, `ERCS/erc-8434.md`, `assets/erc-8434/`, links `../assets/eip-8434/`, `discussions-to` = renamed thread.

## 4. After a number is assigned (do this on branch `add-erc-aid`, PR #2044)

- [ ] Upload the new `assets/erc-8434/` folder (drag the folder onto "Upload files" so the structure is kept).
- [ ] Delete the old `assets/erc-9999/` directory (open it → `…` → Delete directory).
- [ ] Open `ERCS/erc-9999.md` → edit → change the filename field to `erc-8434.md` and replace the content with `ERCS/erc-8434.md` from this package → commit `Rename to ERC-8434`.
- [ ] Verify on the branch: `ERCS/erc-8434.md` exists, `ERCS/erc-9999.md` and `assets/erc-9999/` are gone, CI green.
- [ ] Rename the Magicians thread to `ERC-NNNN: Agent Identity (AID)`.
- [ ] Update `aid-standard` README and memo with the number.

## 5. Content revision R2.4 (after the first review round)

- [ ] On branch `add-erc-aid`: replace `ERCS/erc-8434.md`; replace `assets/erc-8434/contracts/AIDRegistry.sol`, `assets/erc-8434/contracts/mocks/MockIdentityRegistry8004.sol`, `assets/erc-8434/schemas/facet.schema.json`, `assets/erc-8434/tools/aid-resolve/resolve.js`, `assets/erc-8434/vectors/aid-vectors.json`, `assets/erc-8434/vectors/aid-document.sample.json`, all four files under `assets/erc-8434/vectors/fixtures/`; add `assets/erc-8434/vectors/fixtures/interval-gap.json` and `timing.json`. One commit: `ERC-8434: authority intervals, stale-binding takeover, committedAt/subjectWindow (review round 1)`.
- [ ] Leave a PR comment summarising the changes and linking the two Magicians replies.

## 6. Content revision R2.5 (review round 2)

- [ ] On branch `add-erc-aid`: replace `ERCS/erc-8434.md`, `assets/erc-8434/schemas/facet.schema.json`, `assets/erc-8434/schemas/aid-document.schema.json`, `assets/erc-8434/tools/aid-resolve/resolve.js`, `assets/erc-8434/vectors/aid-vectors.json`, `assets/erc-8434/vectors/aid-document.sample.json`, all fixtures; add `assets/erc-8434/vectors/fixtures/log-exclusivity.json`. Commit: `ERC-8434: issuer-declared commitment log profile, exclusivity check, no-merge rule (review round 2)`.
- [ ] Do NOT upload PR-COMMENT-*.md files; they are comment text only.
