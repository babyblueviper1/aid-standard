require("@nomicfoundation/hardhat-ethers");
// Compilation is done by scripts/compile.js (solc-js); Hardhat is used only as a local EVM.
module.exports = {
  solidity: { compilers: [] },
  networks: { hardhat: { chainId: 31337, allowUnlimitedContractSize: false } },
  paths: { sources: "./.hardhat-unused" },
};
