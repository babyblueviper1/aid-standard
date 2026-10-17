# The `did:aid` DID Method

**Status:** Draft 0.1 (companion to ERC-8434 Agent Identity; not part of the ERC)
**Author:** Gary Yang (@garyyang-finchip)
**Conforms to:** W3C Decentralized Identifiers (DIDs) v1.0, DID Resolution v0.3 (resolution result structure)

## 1. Introduction

ERC-8434 defines an *Agent Identity* (AID) as an address-anchored identity for live agents: any account on an EIP-155 chain is a dormant AID, and it becomes active when a live ERC-8004 agent demonstrably operates behind it. ERC-8434 §1 names the DID form of an AID, `did:aid:eip155:{chainId}:{address}`, and leaves the DID method and the DID URL paths for owned resources to a companion specification. This document is that specification.

The method adds no rule to ERC-8434. Every property of a resolved DID Document and its metadata is derived from the ERC: the identifier (§1), the state machine (§2), the binding and authority intervals (§3), the AID Document (§5) and the resolution algorithm (§10). Section references below are to the ERC text as published in `ethereum/ERCs`.

**Relation to `did:pkh`.** For the `eip155` namespace, a `did:aid` whose AID is `DORMANT` resolves to a DID Document equivalent to the corresponding `did:pkh`: a single verification method carrying the account's `blockchainAccountId`. `did:pkh` says who can sign for an address; `did:aid` says, in addition, whether a live agent stands behind it, what it is bound to, and what it has done. Implementations that already resolve `did:pkh:eip155:…` can resolve `did:aid` by adding the registry lookup described in §5.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

## 2. Method name

The method name is `aid`. A DID that uses this method MUST begin with `did:aid:`. The remainder of the DID, the method-specific identifier, is defined in §3.

## 3. Method-specific identifier

The method-specific identifier is the CAIP-10 account identifier of the anchor, with the same `:` separators:

```
did-aid           = "did:aid:" namespace ":" reference ":" address
namespace         = "eip155"                       ; other CAIP-2 namespaces are reserved
reference         = 1*DIGIT                        ; EIP-155 chain id, decimal, no leading zeros
address           = "0x" 40HEXDIG                  ; EIP-55 checksum form is canonical
```

Examples:

```
did:aid:eip155:1:0x65ab82feC38c3A5F2A5b0bd96cB3255E7A45ae42
did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2
```

- Version 1 of this method defines only the `eip155` namespace. A resolver MUST return `methodNotSupported` for any other namespace.
- The `address` is compared case-insensitively: two `did:aid` identifiers that differ only in the case of hexadecimal digits identify the same AID. The canonical form, which resolvers MUST use in the `id` of the DID Document they return, carries the address in EIP-55 checksum form (ERC-8434 §1).
- An AID is chain-scoped (§1). The same address on another chain is a different DID; links between them are expressed with `alsoKnownAs` and count only when mutual (§6.3).

## 4. DID URLs

### 4.1 Paths

ERC-8434 §1 reserves DID URL paths for resources an anchor owns or declares. This method defines the following paths. Dereferencing a path returns the named resource; the resource's media type is reported in `contentType` of the dereferencing metadata.

| Path | Resource | Source |
| --- | --- | --- |
| `/document` | the AID Document (ERC-8434 §5), after the integrity check of §10 step 4 | `documentURI(anchor)` |
| `/agent` | the ERC-8004 registration file of the bound agent | `tokenURI(agentId)` on the bound Identity Registry |
| `/facet/{facetType}` | one facet envelope from the AID Document, with the resolver's classification (`current`, `history`, `invalid`, `unattributable`) and its `attribution`, `timing`, `finality`, `supersededBy`, `supersessionTiming`, `finalization` reports | ERC-8434 §10 |
| `/skill/{tokenId}` | a token-bound executable skill the anchor owns, as a resolution of its own DID Document fragment | the skill contract's `ownerOf(tokenId)` MUST equal the anchor at the time of dereferencing; otherwise `notFound` |
| `/task/{tokenId}` | a token-bound task tender the anchor owns, issued or fulfilled | as above |

`{facetType}` is percent-encoded (the `:` and `/` of a facet type URI are escaped). The skill and task contracts are identified by the `resolver` member of the corresponding `aid:skills/*` and `aid:tasks/*` facets in the AID Document; a resolver MUST NOT dereference `/skill/*` or `/task/*` for an anchor whose Document declares no such facet.

### 4.2 Query parameters

| Parameter | Meaning |
| --- | --- |
| `versionId` | resolve the AID as of this block number (decimal). The resolver reads every registry and Identity Registry value, and the event history, at that block, and reports the same value in `didDocumentMetadata.versionId`. |
| `aidRegistry` | override the AIDRegistry address of §5.1 for this resolution (an address on the DID's chain). |

Other DID Core query parameters (`service`, `relativeRef`, `versionTime`, `hl`) keep their DID Core meaning; `versionTime` is mapped to the last block at or before that time.

## 5. Resolution

### 5.1 Locating the registry

ERC-8434 registries have no owner and no upgrade path, so each chain is expected to carry one canonical deployment. A resolver locates the AIDRegistry for the DID's chain in this order:

1. the `aidRegistry` query parameter or resolution option, if present;
2. the registry table of this method (Appendix A);
3. otherwise `notFound`, with `didResolutionMetadata.error = "notFound"` and `aid.reason = "no registry for chain"`.

A resolver MUST verify that the located contract reports `supportsInterface(0x72750a54)` (the `IAIDRegistry` interface id) before using it.

### 5.2 Algorithm

Resolution is ERC-8434 §10 applied to the anchor, followed by a mapping into a DID Document and its metadata. A conforming resolver:

1. Parses the DID (§3); on failure returns `invalidDid`.
2. Locates the registry (§5.1).
3. Runs ERC-8434 §10 steps 1–11 for the anchor, at the block given by `versionId` or at the latest block. The result is the *resolution report*: `onChainState`, `resolvedState`, `reasons`, `binding`, `authorityIntervals`, the verified AID Document (or none), the classified facets, and the `alsoKnownAs` link statuses.
4. Builds the DID Document per §6 and the metadata per §7.
5. Returns a DID Resolution Result: `didDocument`, `didDocumentMetadata`, `didResolutionMetadata` (`contentType: application/did+ld+json` or `application/did+json`).

Resolution never fails because the AID is dormant, stale or retired: those are states, not errors (§7).

## 6. DID Document

### 6.1 Core properties

| Property | Value |
| --- | --- |
| `id` | the DID in canonical form (§3) |
| `verificationMethod` | exactly one entry, `{id}#controller`, type `EcdsaSecp256k1RecoveryMethod2020`, `controller` = the DID, `blockchainAccountId` = `eip155:{chainId}:{address}` |
| `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation` | `["{id}#controller"]` |
| `controller` | absent (the anchor controls itself; a successor does not control the retired anchor's key) |

For a contract account, the single verification method is the same; verifiers validate signatures through ERC-1271 against the account on the DID's chain, as ERC-8434 does for `bindWithSig`.

### 6.2 Services

Services are present only when the resolution report shows a verified AID Document or a binding; a `DORMANT` AID has none.

| `id` | `type` | `serviceEndpoint` | When present |
| --- | --- | --- | --- |
| `{id}#aid-document` | `AIDDocument` | the on-chain `documentURI` (any URI, including `data:`) | a document URI is set and its digest verifies (§10 step 4) |
| `{id}#erc8004` | `ERC8004Agent` | the registration file URI (`tokenURI`), plus properties `registry` (CAIP-10 of the Identity Registry) and `agentId` | a binding exists |
| `{id}#aid-successor` | `AIDSuccessor` | the successor's `did:aid` | the AID is `RETIRED` with a successor |
| one per entry | the entry's `name`, prefixed `erc8004:` when it is not already a URI or a registered DID service type | the entry's `endpoint` | the registration file's `services[]` entries, mapped only while the anchor's authority interval for the bound agent is open (§3 of the ERC); an entry whose `type` is `DID` is not mapped (it is the reverse pointer of ERC-8434 §3) |

Services from the registration file are the operational endpoints of the agent (for example an A2A or MCP endpoint). Because they are keyed by `agentId`, they are attributed to this anchor only inside its authority interval, exactly as `agentId`-keyed evidence is in §10 step 8: after a transfer, the old anchor's DID Document stops carrying them even if its stale binding record still exists.

### 6.3 `alsoKnownAs`

`alsoKnownAs` lists, as `did:aid` identifiers, the AID Document's `alsoKnownAs` entries whose link status is `confirmed` (the linked AID's Document lists this AID back; ERC-8434 §1, R2.8). Entries reported `unconfirmed` or `unchecked` MUST NOT appear in the DID Document; they are reported in metadata (§7).

### 6.4 Example

A resolution of the second Sepolia anchor of the reference deployment (see `deployments/sepolia/`), state `ACTIVE`:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/secp256k1recovery-2020/v2"],
  "id": "did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2",
  "verificationMethod": [{
    "id": "did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#controller",
    "type": "EcdsaSecp256k1RecoveryMethod2020",
    "controller": "did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2",
    "blockchainAccountId": "eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2"
  }],
  "authentication": ["did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#controller"],
  "assertionMethod": ["did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#controller"],
  "capabilityInvocation": ["did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#controller"],
  "capabilityDelegation": ["did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#controller"],
  "service": [
    { "id": "did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#aid-document", "type": "AIDDocument", "serviceEndpoint": "data:application/json;base64,…" },
    { "id": "did:aid:eip155:11155111:0xd6b24DF77E6f5e7BEFf51460a1d60C2fb7ac9eb2#erc8004", "type": "ERC8004Agent", "serviceEndpoint": "data:application/json;base64,…", "registry": "eip155:11155111:0x8004A818BFB912233c491871b3d84c89A494BD9e", "agentId": 11039 }
  ]
}
```

(The full resolution results for both Sepolia anchors are produced by the reference resolver; see §9.)

## 7. DID Document metadata

| Property | Value |
| --- | --- |
| `versionId` | the block number the resolution was computed at, as a decimal string |
| `updated` | the timestamp of the latest state-changing event of the anchor (`Bound`, `Unbound`, `Heartbeat`, `LivenessWindowSet`, `DocumentURISet`, `FacetSet`, `FacetCleared`, `Retired`) at or before `versionId`, as an XML Schema `dateTime` |
| `deactivated` | `true` when the on-chain state is `RETIRED`; absent otherwise |
| `aid` | the resolution report: `state` (on-chain), `resolvedState`, `reasons[]`, `binding` (`registry`, `agentId`, `boundAt`), `livenessWindow`, `lastSeen`, `authorityIntervals[]`, `documentDigest`, `successor` (as a `did:aid`), `alsoKnownAs[]` (each link with its `status`), and `facets` (the classified envelopes of §10 step 11) |

Everything AID-specific lives in metadata so that the DID Document itself stays within DID Core vocabulary and needs no method-specific JSON-LD context. A relying party that only wants a key reads the DID Document; one that wants to know whether the agent is alive reads `aid.resolvedState`.

State mapping:

| ERC-8434 state | DID Document | Metadata |
| --- | --- | --- |
| `DORMANT` | key-only (equivalent to `did:pkh`) | `aid.state = "DORMANT"` |
| `ACTIVE` | full | `aid.state = "ACTIVE"`, `aid.resolvedState` is `ACTIVE` or `STALE` (registration file `active: false`) |
| `STALE` | full; registration-file services kept while the authority interval is open | `aid.state = "STALE"`, `aid.reasons[]` |
| `RETIRED` | full, plus `#aid-successor` when a successor was named | `deactivated: true`, `aid.successor` |

## 8. Operations

All operations are ERC-8434 registry calls authorised by the anchor; the method introduces no contract surface.

| DID operation | ERC-8434 |
| --- | --- |
| Create | implicit: every account is a `DORMANT` AID. Activation is `bind(registry, agentId)` (or `bindWithSig`) by an anchor that owns the agent or is its `agentWallet`. |
| Read | §5 of this document |
| Update | `setDocumentURI`, `setFacet` / `clearFacet`, `heartbeat`, `setLivenessWindow`, `unbind`, `bind` (re-binding opens a new authority interval; it never authorises the gap) |
| Deactivate | `retire(successor)`: irreversible; history is kept; the DID resolves with `deactivated: true` |

**Key rotation.** The anchor *is* the key. An externally owned account cannot rotate; a contract account rotates its signers internally and the DID is unaffected (verification is ERC-1271). Migration of an agent to a new key is `retire(successor)` on the old anchor and `bind` of the same agent by the new one; when the old anchor's key is lost, the new owner or wallet of the agent takes over the stale binding (ERC-8434 §3, Takeover) and the old DID is left `STALE` or `DORMANT`, never silently rewritten.

## 9. Reference implementation

The reference resolver of ERC-8434 (`tools/aid-resolve/resolve.js`) implements §10 of the ERC. The `--did` output of that tool (`tools/aid-resolve/did.js`, planned) maps its report into the DID Resolution Result of §5.2. Resolution results for the two anchors of the Sepolia reference deployment are published in `deployments/sepolia/` next to the resolver's raw output.

## 10. Security and privacy considerations

The security considerations of ERC-8434 apply unchanged (gap evidence, hostage bindings, hidden and late supersession, cross-chain impersonation, post-retirement activity, liveness spam, discovery mismatch). In addition:

- **Trust in the resolver's data source.** A `did:aid` resolution is only as good as the chain data it reads. Relying parties SHOULD require `versionId` and SHOULD prefer resolvers that expose the raw registry reads and event logs so that the mapping can be re-checked, as the reference resolver does.
- **Chain scoping.** The chain id is part of the DID; signatures over DID-bound data MUST bind the chain id (EIP-712 domain or equivalent) so that a document signed for one chain's DID cannot be replayed under the same address on another.
- **Services are attributed, not asserted.** A service copied from the ERC-8004 registration file is listed only inside the anchor's authority interval; implementations that cache DID Documents MUST drop these services when the interval closes.
- **No personal data.** AID Documents and registration files are public. Facet contents that describe behaviour default to commitment plus ZK predicates (ERC-8434 §9); the DID Document never embeds facet contents, only pointers.
- **Dormant does not mean absent.** A key-only DID Document says nothing about whether the address is an agent at all. Relying parties MUST read `aid.resolvedState` before treating a `did:aid` as a live agent.

## Appendix A. Registry table

| Chain (`namespace:reference`) | AIDRegistry | Notes |
| --- | --- | --- |
| `eip155:11155111` (Sepolia) | `0x01C05738eebD20DC80bBb9Fa1Ceb1165af8dA00F` | reference deployment, 2026-10-15; Sourcify exact match |

Entries are added when a canonical deployment exists on a chain. Deployments on other chains MAY be used with the `aidRegistry` option before they are listed.

## Appendix B. Open points for the next revision

- Whether the registration file's `services[]` mapping (§6.2) belongs in version 1 or in a profile.
- The `versionTime` mapping and whether `/facet/*` dereferencing returns the envelope only or the resolver's classification as well.
- Registration of the method name in the W3C DID method registry.
