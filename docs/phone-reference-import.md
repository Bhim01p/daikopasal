# Phone comparison catalogue

The reference catalogue is independent of saleable inventory. It has no shop prices, stock, images, checkout or EMI eligibility. The comparison page loads it from `GET /api/reference-phones`; the first selector lists shop phones, and the second searches reference configurations and shop phones. Existing reference-based URLs remain supported.

## Included data

- Original CSV: `data/phone-reference/phones-2026-10-13.csv`.
- 83 configurations representing 50 brand/model pairs from the supplied CSV.
- Two existing manufacturer references retained: Redmi 9 Nepal and Redmi 10 Global.
- Import schema and supplied verification report are saved alongside this document.

The CSV and its verification claims were supplied by the owner. The implementation validates structure, types, IDs, dates and source-link syntax; it does not independently establish the factual accuracy of every specification. Consult the supplied verification report for unresolved source conflicts. No external scraping or paid API is used.

## Future CSV updates

From the project root:

```powershell
node scripts/import-phone-csv.mjs "path/to/updated-phones.csv"
npm.cmd run build
npm.cmd run test:backend
```

The script validates the entire CSV before updating `backend/seed/reference-phones.json`. It upserts by stable CSV ID (internally prefixed with `csv-`), retains other reference records and leaves the live database untouched. Repeating an import does not create duplicates. This is an upsert, not a deletion/replacement command: removing a row from a later CSV does not delete an existing reference.

After normal deployment, the next backend request migrates the reference catalogue into a separate `referencePhones` collection in the existing Neon JSONB store. A content revision prevents repeat migrations. The same migration runs for local file storage. It preserves products, stock, accounts, orders and custom reference records. This deliberately uses the existing database architecture; no new environment variables, schema credentials or external service are needed.

## Presentation

- Missing values remain absent and display as “Not available”.
- Explicitly unsupported wireless charging (`0`) displays as “No”.
- Region, RAM and storage identify each configuration. Brand/model/variant words are searchable; brand filtering affects only the second selector.
- All supplied source links and the source-check date are shown. This date comes from the CSV, not a fresh site verification.
- Reference entries are labelled for comparison only; they do not imply shop availability.
- Phone layouts scroll the comparison table horizontally within the page. Both themes and Nepali interface text are supported.

## Checks

`backend/test/phone-reference.test.mjs` covers CSV parsing/validation, missing versus explicitly unsupported specifications, duplicate protection, preserving unrelated shop data, idempotent database migration and the public endpoint. Its database adapter is an isolated transaction test, not a live Neon connection.

`scripts/verify-phone-csv.cjs` checks searching and variants, first-selector isolation, old/new comparison links, source links, missing data, failure/retry, Nepali and phone/desktop themes against an isolated local QA server.
