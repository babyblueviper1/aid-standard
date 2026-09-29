#!/usr/bin/env python3
"""Derive the ethereum/ERCs filing variant (ercs-pr-package/ERCS/erc-9999.md) from ERCS/erc-aid.md.

The source text is the design truth and references three proposals that are still open PRs
(KYA Framework, Token-Bound Executable Skills, Token-Bound Task Tenders). Their files do not exist
on ethereum/ERCs master, so any `ERC-NNNN` token (which lint requires to be a link) breaks the build.
This script rewrites the text to be self-contained: an abstract assertion-registry section replaces
the KYA dependency, and skill/task proposals are described generically. Re-run after editing the source.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "ERCS" / "erc-aid.md").read_text()
s = src

def rep(old, new, count=1):
    global s
    if old not in s:
        sys.exit(f"pattern not found:\n{old[:120]}")
    s = s.replace(old, new, count)

# ---- preamble -------------------------------------------------------------
rep("description: Address-anchored identity for live agents over ERC-8004 and ERC-8419, with time-windowed, provenance-tagged profile facets",
    "description: Address-anchored identity for live agents over ERC-8004 and assertion registries, with time-windowed, provenance-tagged profile facets")
rep("requires: 155, 165, 712, 1271, 8004, 8419", "requires: 155, 165, 712, 1271, 8004")

# ---- abstract ---------------------------------------------------------------
rep("ERC-8004 for the registration file and raw third-party feedback, [ERC-8419](./eip-8419.md) for attested and zero-knowledge-proved assertions (credit, Know-Your-Agent levels, audits, profiler outputs), and, informatively, [ERC-8338](./eip-8338.md) and [ERC-8414](./eip-8414.md) for skill and task interaction records.",
    "ERC-8004 for the registration file and raw third-party feedback, and *assertion registries* (a minimal interface defined in this ERC, satisfied by the Know-Your-Agent framework proposal under review in this repository) for attested and zero-knowledge-proved assertions (credit, trust levels, audits, profiler outputs). Skill and task interaction records are derived, informatively, from token-bound skill and task contracts.")

# ---- motivation -------------------------------------------------------------
rep("Every event emitted by an ERC-8004 registry, an ERC-8338 skill token or an ERC-8414 task tender carries the acting address.",
    "Every event emitted by an ERC-8004 registry, a token-bound skill contract or a token-bound task-tender contract carries the acting address.")

# ---- overview table ---------------------------------------------------------
rep("| Assertions | ERC-8419 | issuers, provers | credit scores, KYA levels, audits, profiler outputs, ZK predicates |\n| Skill / task records | ERC-8338 / ERC-8414 (informative) | derived from events | roles the anchor played in skill and task contracts |",
    "| Assertions | assertion registries (§5) | issuers, provers | credit scores, trust levels, audits, profiler outputs, ZK predicates |\n| Skill / task records | token-bound skill / task contracts (informative) | derived from events | roles the anchor played in skill and task contracts |")

# ---- new §5 Assertion registries; renumber 5..11 -> 6..12 --------------------
for n in range(11, 4, -1):
    s = s.replace(f"### {n}. ", f"### {n+1}. ")
s = s.replace("(see §6)", "(see §7)").replace("§10 in JavaScript", "§11 in JavaScript")

assertion_section = '''### 5. Assertion registries

Facets of provenance `ATTESTED` and `PROVED`, and every scheme reference in this ERC, resolve against an **assertion registry**: a contract in which third parties record claims about a subject under a *scheme* whose descriptor is pinned by hash. This ERC does not define such a registry; it defines the minimum it relies on. A registry satisfying the following is *AID-compatible*. The Know-Your-Agent framework proposal under review in this repository is the reference registry and satisfies it as written.

```solidity
struct Subject { bytes32 subjectType; bytes subjectData; }

interface IAIDAssertionRegistry {
    /// (level, expiresAt, assertionId) of the strongest live assertion for `subject` under `schemeId`
    /// issued by one of `issuers` (empty array = any issuer). level 0 / expiresAt 0 when none.
    function resolve(Subject calldata subject, bytes32 schemeId, address[] calldata issuers)
        external view returns (uint8 level, uint64 expiresAt, bytes32 assertionId);
    /// true iff resolve(...) returns level >= minLevel and expiresAt > block.timestamp
    function check(Subject calldata subject, bytes32 schemeId, uint8 minLevel, address[] calldata issuers)
        external view returns (bool);
}

interface IAIDSchemeRegistry {
    struct Scheme {
        address controller;   // who may update the descriptor URI / freeze the scheme
        string  schemeURI;    // descriptor: schema, algorithm, level semantics, kind
        bytes32 schemeHash;   // pins the descriptor
        uint8   mode;         // 0 = ATTESTED, 1 = PROVED
        address verifier;     // PROVED mode: on-chain proof verifier
        bytes32 predecessor;  // scheme this one supersedes, or 0
        bool    frozen;
    }
    function getScheme(bytes32 schemeId) external view returns (Scheme memory);
}
```

Requirements:

- **Subject encoding.** The subject of every AID-related assertion is the anchor: `subjectType = keccak256("account")`, `subjectData = abi.encode(uint256 chainId, address anchor)`, `subjectKey = keccak256(abi.encode(subjectType, subjectData))`.
- **Two issuance modes.** `ATTESTED`: the assertion is recorded in a transaction sent by the issuer, who is accountable for it. `PROVED`: the assertion is recorded only after an on-chain verifier (`verifier` in the scheme) accepts a proof against the subject and public inputs; the recorded issuer is the verifier adapter. A scheme declares its `mode`.
- **Expiry.** Every assertion carries `expiresAt`; `resolve` and `check` MUST ignore expired, revoked or superseded assertions.
- **Scheme pinning.** `schemeHash` MUST be the digest of the descriptor at `schemeURI`; a descriptor that changes requires a new scheme id (or an explicit predecessor link). Descriptors for credit schemes declare `"kind": "credit"`.
- **Events.** Issuance, revocation and supersession MUST be emitted with the `subjectKey` indexed so that resolvers can enumerate an anchor's assertions.

Nothing in this ERC depends on other features of the reference registry; a registry that adds admission domains, policies or bridges remains AID-compatible.

'''
rep("### 6. AID Document", assertion_section + "### 6. AID Document")

# ---- facet table / provenance / windows / access / resolution ----------------
rep("| `aid:core/kya/v1` | The set of ERC-8419 assertions whose subject is the anchor | `ATTESTED` / `PROVED` | `erc8419-assertion` |",
    "| `aid:core/kya/v1` | The set of assertion-registry assertions whose subject is the anchor | `ATTESTED` / `PROVED` | `erc8419-assertion` |")
rep("its derivation algorithm pinned as an ERC-8419 scheme (`schemeURI` + `schemeHash`) so that the version is fixed on chain.",
    "its derivation algorithm pinned as an assertion-registry scheme (`schemeURI` + `schemeHash`, §5) so that the version is fixed on chain.")
rep("| `OBSERVED` | anyone, from on-chain events under an algorithm pinned by an ERC-8419 scheme hash |",
    "| `OBSERVED` | anyone, from on-chain events under an algorithm pinned by a scheme hash (§5) |")
rep("| `ATTESTED` | a third-party issuer via ERC-8419 `attest` |", "| `ATTESTED` | a third-party issuer recording an assertion in `ATTESTED` mode (§5) |")
rep("| `PROVED` | a prover via ERC-8419 `attestWithProof` |", "| `PROVED` | a prover recording an assertion in `PROVED` mode (§5) |")
rep("an ERC-8419 scheme whose descriptor declares `\"kind\": \"credit\"`", "an assertion-registry scheme whose descriptor declares `\"kind\": \"credit\"`")
rep("predicates are proved with ERC-8419 `attestWithProof` against the commitment, using the verifier named in `access.verifier`",
    "predicates are proved by recording a `PROVED`-mode assertion (§5) against the commitment, using the verifier named in `access.verifier`")
rep("verify ERC-8419 assertions with `resolve`/`check` under the reader's issuer set",
    "verify assertions with the registry's `resolve`/`check` under the reader's issuer set")
rep("resolver pointer. Any party holding only an address", "resolver pointer. Any party holding only an address")  # no-op guard

# ---- interoperability -------------------------------------------------------
rep('''**ERC-8419.** The subject of every AID-related assertion is the anchor encoded with the ERC-8419 subject type `account`: `subjectData = abi.encode(uint256 chainId, address anchor)`, `subjectKey = keccak256(abi.encode(keccak256("account"), subjectData))`. Aggregated credit scores are ERC-8419 assertions whose `level` (or a scheme-defined value in `claimDigest`) is the score, whose `claimDigest` MAY commit to the head of the issuer's feedback hash chain, and whose `expiresAt` is the credit window. Facet-type descriptors and `OBSERVED` algorithms are ERC-8419 schemes. The ERC-8419 bridge to the ERC-8004 Validation Registry applies unchanged to the bound agent.

**ERC-8338 / ERC-8414 (informative).** `aid:skills/erc8338/v1` and `aid:tasks/erc8414/v1` are derived from those contracts' events with the anchor in a role.''',
'''**Assertion registries.** Aggregated credit scores are assertions whose `level` (or a scheme-defined value committed in the assertion) is the score, whose claim digest MAY commit to the head of the issuer's feedback hash chain, and whose `expiresAt` is the credit window. Facet-type descriptors and `OBSERVED` algorithms are schemes of the same registry. Where the registry offers a bridge into the ERC-8004 Validation Registry, it applies unchanged to the bound agent.

**Token-bound skill and task contracts (informative).** `aid:skills/erc8338/v1` and `aid:tasks/erc8414/v1` are derived from the events of token-bound executable-skill and task-tender contracts (two proposals by the same author under review in this repository, after which the facet types are named) with the anchor in a role.''')

# ---- rationale / backwards compat / test cases ------------------------------
rep("Aggregated, time-windowed, issuer-signed scores are exactly what an ERC-8419 assertion is.",
    "Aggregated, time-windowed, issuer-signed scores are exactly what an assertion-registry assertion is.")
rep("No change to ERC-8004, ERC-8419, ERC-8338 or ERC-8414 contracts is required.",
    "No change to ERC-8004 contracts, to assertion registries, or to skill and task contracts is required.")
rep("the ERC-8419 `account` subject key for an anchor", "the `account` subject key of an anchor (§5)")

# add rationale paragraph explaining the abstraction
rep("**No governance surface.**", '''**Assertion registries as an interface, not a dependency.** The facets that carry trust — credit, audits, proved predicates — need a registry with subjects, pinned schemes, expiry and two issuance modes. Specifying that minimum inside this ERC keeps it self-contained and lets more than one registry qualify; the reference registry is the Know-Your-Agent framework proposal, and a later revision will cite it by number once it is published.

**No governance surface.**''')

# ---- final checks -----------------------------------------------------------
bad = re.findall(r"(?i)\b(?:eip|erc)-(?:8419|8338|8414)\b", s)
if bad:
    sys.exit(f"unmerged proposal tokens remain: {bad}")
out = root / "ercs-pr-package" / "ERCS" / "erc-9999.md"
out.write_text(s)
print("wrote", out, len(s), "bytes")
