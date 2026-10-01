# ERC-8434 Magicians replies — round 1 (2026-10-01)

Thread: https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805 · PR: ethereum/ERCs#2044

Post each block as a separate reply to the quoted post. Section numbers cited are those of the PR text (`erc-8434.md`): §5 Assertion registries, §7 Facet types, §8 Provenance, §9 Validity windows, §11 Resolution.

---

## Reply to #2 (babyblueviper1) — `committedAt`

@babyblueviper1 Agreed that this is a real gap. Provenance (§8) says *who* stands behind a facet and the validity window (§9) says *for how long*; neither says *when* the claim existed relative to the behaviour it grades, and for a judgment that is the difference between a prediction and a recollection.

I'd take it roughly as you describe, with three refinements:

1. **Orthogonal to provenance, not a fifth class.** Timing matters for `ATTESTED` facets, but equally for `OBSERVED` and `PROVED` commitments, so I'd model it as an optional envelope member — `committedAt: { anchor, proof }` — that a resolver verifies and reports separately. A facet without a valid `committedAt` keeps its provenance and is reported as *timing unverified*, never as pre-outcome, the same way §8 refuses to let `SELF` read as verified.
2. **The facet needs an explicit subject window.** "Precedes the end of the window" needs the window the claim is *about*, which is not `validUntil` (how long the claim counts). So the envelope gains `subjectWindow: { from, until }` next to `committedAt`, and the rule becomes: pre-outcome iff `committedAt` is verifiably earlier than `subjectWindow.until`.
3. **Existence is not exclusivity.** A timestamp proves those bytes existed at that time. It does not prove the issuer didn't timestamp several contradictory verdicts and reveal only the one that turned out right. For a facet to be *read* as pre-outcome I think its commitment has to sit in a public, append-only log that a resolver can enumerate per `(issuer, subject, facetType, subjectWindow)`, so it sees every commitment the issuer made, not just the one presented. Curious whether you see a lighter way to close that.

The rule stays anchor-agnostic: block inclusion, RFC 3161 and OpenTimestamps are all admissible `anchor` kinds, and the resolver checks the proof for whichever is used.

This touches the facet envelope schema, the resolver and the vectors, so it goes into the next content revision of #2044 (the renumbering to 8434 is already in). A vector pair against the reference resolver along the lines you suggest — anchor before `subjectWindow.until` → may be read as pre-outcome; anchor after → timing unverified — would be welcome; I'll merge it with the schema change. The ERC-8414 companion in task-token-standard#2 I'll review in that repository.

---

## Reply to #3 (chugarchugarr) — authority intervals

@chugarchugarr Agreed, and I'll make it normative. The current text only says what the binding means *now*; it does not say what a binding that comes back means for the time it was gone, and a resolver could read it either way.

Proposed rule for the next revision:

- **Authority intervals.** An anchor holds authority over a bound agent exactly while the binding predicate holds — `ownerOf(agentId) == anchor` or `getAgentWallet(agentId) == anchor`, with the binding record intact. Each time the predicate becomes true again, a *new* interval opens. Re-establishing the relation never authorizes the gap.
- **Attribution.** Evidence attributed to an AID *through the binding* — anything keyed by `agentId`: ERC-8004 feedback and validation, and the registration file itself — counts only if its issuance or observation falls inside an authority interval. Evidence outside every interval is still reported, but as not attributable to this AID.
- **No new on-chain state.** `state()` stays the current-time predicate it is today. Resolvers reconstruct intervals from the bound registry's event history, and ERC-8004 makes that fully observable: ownership changes are `Transfer` events, every wallet change is a `MetadataSet` event under the reserved `agentWallet` key, and a transfer clears the wallet, so a wallet relation can never move away without an event marking the boundary.

Two things this raises that I'd rather settle explicitly:

1. **Evidence keyed by the address itself.** Skill and task records derived from events where the anchor is the actor are the address's own acts, so impersonation is not the issue. But during a gap the address is not demonstrably operating *as this agent*. My inclination is to keep them in the profile, marked as outside an authority interval, rather than drop them — they are still facts about the address. Views welcome.
2. **A stale binding should not hold the agent hostage.** In the reference registry a binding whose predicate has failed still blocks the agent's new controller from binding it until the old anchor unbinds or retires. I think the registry should let a qualifying new anchor take the binding over once the old predicate is false, emitting `Unbound` for the old anchor — which also gives intervals a clean on-chain boundary. That is a behavioural change to `bind` (interface unchanged), so it will be flagged in the changelog with regression cases for the A → gap → A round trip rather than folded in silently.

On ERC-8323: agreed on the principle — immutable source provenance and current ownership validity are different facts and neither should stand in for the other. AID stays agnostic about which provenance mechanism a deployment uses; the interval rule is what keeps either from being read as evidence about the gap.

---

## Decisions taken for these replies (Gary to veto if any is wrong)

| # | Decision |
|---|---|
| 1–2 | `committedAt` + `subjectWindow` adopted as optional envelope members, orthogonal to provenance. |
| 3 | "Existence ≠ exclusivity" raised as a question (append-only, enumerable commitment log). |
| 4 | babyblueviper1 may draft the vector pair; Gary merges. |
| 5 | task-token-standard#2 reviewed in-repo, not in the thread; no endorsement of invinoveritas in the thread. |
| 6 | Authority-interval rule becomes normative; no on-chain epoch. |
| 7 | Address-keyed evidence during a gap: kept, marked *outside authority interval*. |
| 8 | Verified: ERC-8004 wallet changes emit `MetadataSet` under the reserved key `agentWallet`; transfers clear the wallet. Intervals are reconstructible from `Transfer` + `MetadataSet(agentWallet)`. |
| 9 | Stale-binding takeover adopted for the reference registry (behavioural change to `bind`, interface and interfaceId unchanged). |
| 10 | Renumbering is already merged into #2044 (CI green); content revision is a separate follow-up commit. |

## Follow-ups this creates for the next revision (R2.4)

- Envelope schema: `subjectWindow { from, until }`, `committedAt { anchor: block|rfc3161|ots, proof }`; resolver verifies and reports `timing: pre-outcome | unverified`.
- Spec §3/§11: authority intervals + attribution rule; §4 rules: takeover of a stale binding; Security Considerations: gap evidence, hostage binding.
- `AIDRegistry._bind`: allow takeover when the existing binding's predicate is false; emit `Unbound(old)`; new tests (takeover allowed / refused while predicate still true / A→gap→A reopens interval).
- Vectors: timing pair; fixtures for an interval gap.
- Main post top: fix the Discourse-mangled PR link block (Claire).
