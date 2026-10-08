const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync("backend/seed/products.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const exported = {};
vm.runInNewContext(compiled.outputText, { exports: exported });
fs.writeFileSync(
  "backend/seed/products.json",
  JSON.stringify(exported.products, null, 2) + "\n",
);
console.log(`Prepared ${exported.products.length} seed products.`);
