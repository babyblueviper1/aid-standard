Revision after the first third-party commitment log recorded against the Sepolia reference deployment ([thread](https://ethereum-magicians.org/t/erc-8434-agent-identity-aid/29805)):

- **Content digest algorithm (§6, §10)**: the facet envelope gains an optional `digestAlg` (`keccak256 | sha256`; absent = `keccak256`) naming the hash of the JCS-canonical content that `digest` carries for `PUBLIC`/`GATED` facets. The text previously fixed the hash only for the AID Document digest. No other normative change.
- Assets: facet schema (`digestAlg`), reference resolver (`contentDigest`, `verifyContent`). Test suite 33 → 34.
- Acknowledgements updated.
