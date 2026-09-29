// Compile all contracts with solc-js (no network needed) and write artifacts to build/.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const root = path.join(__dirname, "..", "assets", "erc-aid", "contracts");
const sources = {};
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".sol")) sources[path.relative(root, p)] = { content: fs.readFileSync(p, "utf8") };
  }
}
walk(root);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "metadata"] } },
  },
};
function findImports(p) {
  const abs = path.join(root, p.replace(/^\.\//, ""));
  if (fs.existsSync(abs)) return { contents: fs.readFileSync(abs, "utf8") };
  return { error: "not found " + p };
}
const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
let failed = false;
for (const e of out.errors || []) {
  console.error(e.formattedMessage);
  if (e.severity === "error") failed = true;
}
if (failed) process.exit(1);
const build = path.join(__dirname, "..", "build");
fs.mkdirSync(build, { recursive: true });
for (const file of Object.keys(out.contracts)) {
  for (const name of Object.keys(out.contracts[file])) {
    const c = out.contracts[file][name];
    fs.writeFileSync(
      path.join(build, name + ".json"),
      JSON.stringify({ contractName: name, abi: c.abi, bytecode: "0x" + c.evm.bytecode.object, deployedBytecode: "0x" + c.evm.deployedBytecode.object }, null, 2)
    );
    console.log("compiled", name, (c.evm.deployedBytecode.object.length / 2) + " bytes");
  }
}
console.log("solc", solc.version());
