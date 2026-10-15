Reference deployment on Sepolia ([thread](https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805)):

- `AIDRegistry` at `0x01C05738eebD20DC80bBb9Fa1Ceb1165af8dA00F` (Sourcify exact match), bound to the official ERC-8004 Identity Registry; agent `11039` walks through bind → predicate lost by an ERC-8004 transfer → takeover of the stale binding → retirement with a successor.
- The reference resolver's run against that history (authority intervals reconstructed from `Bound`/`Unbound` + `Transfer`/`MetadataSet(agentWallet)`) is recorded with the source repository and reproducible offline.
- Text change: one informative sentence in Reference Implementation pointing at the deployment. No normative change; assets unchanged.
