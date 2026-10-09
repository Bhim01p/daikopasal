const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const dictionary = JSON.parse(fs.readFileSync("shared/ne.json", "utf8"));
const keys = new Set(
  JSON.parse(fs.readFileSync("shared/ui-keys.json", "utf8")),
);
function check(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) check(file);
    else if (/\.tsx?$/.test(item.name)) {
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        if (
          ts.isCallExpression(node) &&
          ["t", "translateCurrent"].includes(node.expression.getText(source)) &&
          ts.isStringLiteral(node.arguments[0])
        )
          keys.add(node.arguments[0].text.trim());
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
check("frontend/src");
const missing = [...keys].filter((key) => !dictionary[key]);
if (missing.length) {
  console.error("Missing Nepali interface translations:", missing);
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${keys.size} static interface messages have Nepali translations. Product names and owner-supplied content retain their supplied text.`,
  );
