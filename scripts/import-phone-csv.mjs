import { readFileSync, writeFileSync } from "node:fs";
import { parsePhoneCsv } from "../backend/phone-reference.mjs";

const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node scripts/import-phone-csv.mjs path/to/phones.csv",
  );
const imported = parsePhoneCsv(readFileSync(input, "utf8"));
if (!imported.length)
  throw new Error("The CSV contains no phones; seed has not been changed.");
const target = new URL(
  "../backend/seed/reference-phones.json",
  import.meta.url,
);
const existing = JSON.parse(readFileSync(target, "utf8"));
const ids = new Set(imported.map((p) => p.id));
const merged = [...existing.filter((p) => !ids.has(p.id)), ...imported];
writeFileSync(target, JSON.stringify(merged, null, 2) + "\n");
console.log(
  `Validated ${imported.length} configurations. Prepared ${merged.length} reference configurations for local/serverless database migration. No live database or inventory was changed.`,
);
