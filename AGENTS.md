# Project-wide Codex instructions

This is an existing working project. The current codebase is the source of truth. Minimize Codex usage while completing tasks correctly.

## Efficiency

- Do not re-analyze the entire repository.
- Inspect only files directly relevant to the request; search for the relevant component/file first.
- Reuse existing project understanding, components, utilities, styles, APIs, types, and patterns.
- Do not rebuild, restructure, refactor, or rewrite working code unless explicitly requested.
- Make the smallest correct change and do not modify unrelated files.
- Preserve existing functionality, UI, APIs, routes, database behavior, responsive behavior, themes, and language support unless the request changes them.
- Do not install or update packages unless necessary.
- Avoid expensive repository-wide commands.
- Prefer targeted tests/checks for changed features. Run broader verification only when reasonably required or explicitly requested.
- Do not inspect Git history or browse external documentation unless necessary.
- Before acting, silently determine the minimum files and actions required. If 1–3 files are sufficient, do not inspect dozens of files.
- Do not sacrifice correctness to reduce usage; inspect or test more when genuinely necessary.

## Response style

After completing a task, respond briefly:

Changed:
- file(s)
- one-line description

Tested:
- only checks actually run

Do not give a long summary unless asked.

## Safety

- Never delete or replace large sections of working code without explicit instruction.
- Never reset, discard, or overwrite uncommitted changes.
- Never modify .env values, credentials, production data, deployment configuration, or database migrations unless specifically required.
- When uncertain about a potentially destructive action, ask first.

---

## Shared Multi-Agent Protocol

This file serves as the shared project context and handoff log between coding agents (Google Antigravity and GPT).

### Workflow Rules for All Agents
1. **Read AGENTS.md** before starting any task.
2. **Inspect only relevant repository files** in targeted read operations.
3. **Never reveal or log secrets or environment variable values** (only reference variable names).
4. **Preserve working functionality** and make the minimal required edits.
5. **Respect protected areas** unless explicitly instructed otherwise.
6. **Update the Agent Handoff section** after completing any significant task using the standardized format.

### Protected Areas (Do Not Modify Unless Explicitly Requested)
- Checkout (`frontend/src/pages/Checkout.tsx`, `backend/payments.mjs`)
- Payments (`PAY_AT_SHOP`, `MANUAL_QR`, QR verification logic)
- Orders and order lifecycle (`backend/server.mjs`, `frontend/src/utils/orders.ts`)
- Billing and PDF generation (`backend/billing.mjs`)
- Authentication & Sessions (`backend/customer-auth.mjs`, admin/staff auth)
- Database schema & migrations (`backend/database-store.mjs`, `backend/store.mjs`)
- Phone master catalogue specifications (`data/phone-reference/phones_master_catalogue_v3_nepal_expanded.csv`)
- Phone bilingual descriptions (`data/phone_descriptions.json`) — 222 devices; do not overwrite or regenerate
- Delivery logic, SEO, canonical URLs, robots.txt, and Vercel deployment configuration

### Phone Catalogue & Image Pipeline Architecture
- **Catalogue Structure**:
  - `Device` (`device_id`, brand, model, generic specs)
  - `Device Variant` (RAM/storage configuration)
  - `Store Product` (Store listing: price, stock, condition, warranty, color)
- **Image Priority**:
  1. Real / store-uploaded product photos
  2. Generic catalogue images (`product.catalogueImage`)
  3. Placeholder illustration
- **Rules**:
  - RAM/storage variants of the same physical phone share catalogue images.
  - Used-phone photos must NEVER be replaced by generic catalogue images.
  - Cloudinary public ID pattern: `machhapuchhree-electronics/catalogue/phones/{device_id}/{position}`.
  - Cloudinary uploads must preserve `overwrite: false`.

---

## Agent Handoff

### Entry: 2026-10-18 - GPT/Codex (Admin Image Count Discrepancy)
- **Agent**: GPT/Codex
- **Task completed**: Diagnosed and fixed admin catalogue image counts using the same manifest/runtime loader as the storefront.
- **Files changed**: `backend/catalogue-images.mjs`.
- **Tests/checks performed**: Compared `data/phone_images.csv` against the runtime catalogue loader; identified all 14 excluded manufacturer-asset records; Node syntax check, frontend TypeScript check, and production build passed.
- **Result**: The loader now recognizes both `official_manufacturer_press_asset` and `official_manufacturer_asset`. Runtime totals are 222 devices: 11 with 3+ photos, 8 with 2, 33 with 1, and 170 with none; 52 devices are covered.
- **Known issues**: The earlier final report claiming 55 covered devices was overstated by 3; the current manifest contains 52 uploaded device IDs. The previous admin total of 38 was caused by rejecting `official_manufacturer_asset`, not missing Cloudinary images.
- **Recommended next step**: Refresh the admin page and verify the dynamic filters against the corrected runtime totals. Do not alter image data based on the old 55-device report.

### Entry: 2026-10-18 - GPT/Codex (Logout Order Cache Fix)
- **Agent**: GPT/Codex
- **Task completed**: Cleared the browser’s cached order receipt list during customer logout so a signed-out session cannot keep displaying the previous signed-in customer’s order.
- **Files changed**: `frontend/src/context/CustomerContext.tsx`.
- **Tests/checks performed**: Frontend TypeScript check passed.
- **Result**: Logout now clears `me-orders` before dispatching the existing logout event; server-owned account orders remain protected by the authenticated customer-orders endpoint.
- **Known issues**: Guest receipts are also removed on logout from that browser, which is intentional for session privacy.
- **Recommended next step**: Verify logout from Account and My Orders on mobile and desktop.

### Entry: 2026-10-18 - GPT/Codex (Catalogue Variant Label Fix)
- **Agent**: GPT/Codex
- **Task completed**: Fixed admin catalogue variant labels so missing RAM/storage values are omitted instead of rendered as `? GB`; duplicate normalized variant labels are removed in the selector.
- **Files changed**: `backend/phone-reference.mjs`, `frontend/src/pages/Admin.tsx`.
- **Tests/checks performed**: V3 data audit (290 rows, 222 unique devices, no duplicate variant groups); Node syntax check; frontend TypeScript check; production build passed.
- **Result**: Known iPhone base/reference rows now show region-only labels when both values are absent; storage-only and RAM-only variants render only the known value; complete variants render RAM/storage together. Existing image-count filters, search, variant selection, and autofill remain supported.
- **Known issues**: V3 intentionally contains 186 base/reference rows without RAM and storage; these were not modified. `poco-poco-f8-pro` and `poco-f8-pro` are separate IDs but appear to be an alias/duplicate naming pair and need a separate reference audit before cleanup.
- **Recommended next step**: Review the POCO alias pair before any catalogue ID cleanup; no automatic merge was performed.

### Entry: 2026-10-18 - GPT/Codex (Final Batch 3 Image Import)
- **Agent**: GPT/Codex
- **Task completed**: Processed the 51 supplied Batch 3 position-1 candidates only. No Batch 4 work or new research was started.
- **Files changed**: `data/phone_images.csv`, `data/phone-reference/image_candidates_batch3.json`, `data/phone-reference/image_batches_batch3.json`, `AGENTS.md`.
- **Tests/checks performed**: Batch 3 dry run (51 selected); controlled import attempted all 51, with one retry of unresolved candidates; 26 uploaded and 25 safely failed; Cloudinary public IDs and manifest records verified; Node syntax checks, frontend TypeScript check, and production build passed.
- **Result**: Final catalogue coverage is 222 devices total: 11 with 3+ photos, 8 with 2 photos, 36 with 1 photo, and 167 with no photos. 55 devices have at least one image (24.77%). The four requested manual-review devices remain at zero and unchanged.
- **Known issues**: 24 failures returned HTTP 429 rate-limit HTML; Samsung Galaxy S26 exceeded the existing 10 MB binary safety limit on its first attempt and returned 429 on retry. No HTML or unsupported binary was uploaded.
- **Recommended next step**: Manual visual QA of the final 55-device coverage. Catalogue image sourcing/import is paused; do not begin another batch without explicit instruction.

### Entry: 2026-10-18 - GPT/Codex (Batch 2 Image Import)
- **Agent**: GPT/Codex
- **Task completed**: Processed Batch 2 only using the supplied 40 verified candidate records. Existing Batch 1 assets and metadata were preserved.
- **Files changed**: `scripts/import-phone-candidates.mjs`, `backend/catalogue-images.mjs`, `data/phone_images.csv`, `data/phone-reference/image_candidates_batch2.json`, `data/phone-reference/image_batches_batch2.json`, `AGENTS.md`.
- **Tests/checks performed**: Batch 2 dry run (40 selected, 40 eligible); controlled import attempted all 40; 25 uploaded and 15 safely rejected after two attempts because their sources returned HTTP 429 HTML; Node syntax checks; frontend TypeScript check; production frontend build passed.
- **Result**: 25 Batch 2 positions are in Cloudinary with device-level `/main`, `/2`, `/3` IDs where available. Galaxy A36 5G remains `needs_manual_review` with zero candidates. Explicit Wikimedia license metadata and manufacturer source classifications were preserved. Xiaomi `application/octet-stream` responses are accepted only after JPEG/PNG/WebP binary signature validation.
- **Known issues**: The 15 unresolved candidates are temporary source rate-limit failures, not accepted invalid images. Devices whose position 1 is rate-limited cannot be surfaced by the current gallery loader until a valid main image is available.
- **Recommended next step**: Perform manual visual QA for the 25 uploaded positions and retry the 15 rate-limited candidates later if desired; do not begin Batch 3 automatically.

### Entry: 2026-10-18 - GPT/Codex (Batch 1 Image Import)
- **Agent**: GPT/Codex
- **Task completed**: Imported the 29 validated Batch 1 Apple Newsroom catalogue image positions into Cloudinary, preserving the existing iPhone 15 main image and adding its positions 2 and 3.
- **Files changed**: `scripts/import-phone-candidates.mjs`, `backend/catalogue-images.mjs`, `data/phone_images.csv`, `data/phone-reference/image_candidates.json`, `data/phone-reference/image_batches.json`.
- **Tests/checks performed**: Candidate dry-run (29 selected, 29 eligible, 0 failures); controlled Cloudinary import (29 uploaded, 0 failures); Node syntax checks; frontend TypeScript check; production frontend build passed.
- **Result**: 9 new Apple devices now have three catalogue images each; iPhone 15 retains its original licensed main and now has positions 2 and 3. Catalogue integration accepts the explicit official-manufacturer press-asset source status without weakening existing CC/licensing validation.
- **Known issues**: Official Apple Newsroom assets do not provide a Creative Commons license in the candidate metadata, so their source-rights status is preserved as `official_manufacturer_press_asset` and no unsupported CC attribution is asserted. Existing Vite warnings about dynamic/static imports remain.
- **Recommended next step**: Verify the nine new galleries and iPhone 15 on the storefront, then review/approve any future image research batch before importing it.

### Entry: 2026-10-18 - Google Antigravity (Batch 1 Image Sourcing)
- **Agent**: Google Antigravity
- **Task completed**: Resolved and validated direct high-resolution catalogue image assets for all 10 Apple devices in Batch 1 (29 verified direct image asset URLs).
- **Files changed**:
  - `data/phone-reference/image_candidates.json` (Populated 29 validated candidate image records across the 10 Batch 1 devices with exact direct URLs, source pages, positions, finishes, and verification status)
  - `data/phone-reference/image_batches.json` (Updated Batch 1 tracking state to `candidates_resolved` for all 10 devices)
  - `AGENTS.md` (Updated Agent Handoff log)
- **Tests/checks performed**:
  - Executed automated HTTP HEAD checks across all 29 candidate image URLs; confirmed 100% (29/29) return HTTP 200 OK with `image/jpeg` MIME type and standard asset sizes (87 KB - 501 KB).
  - Validated JSON structure of `image_candidates.json` and `image_batches.json`.
- **Result**:
  - 10 devices researched; 29 direct image asset URLs resolved and validated.
  - Position 1 of iPhone 15 was preserved (existing uploaded Cloudinary image). Positions 2 and 3 sourced.
  - For each of the remaining 9 devices, 3 distinct, accurate positions (front/hero, color/back lineup, angle/camera detail) were resolved.
  - 0 devices in Batch 1 are missing image candidates.
- **Known issues**:
  - Cloudinary upload and manifest (`data/phone_images.csv`) integration are pending execution by the downstream agent (GPT/Codex).
- **Recommended next step**: GPT/Codex can now proceed with downloading, Cloudinary uploading, updating `data/phone_images.csv`, and storefront verification.

### Entry: 2026-10-18 - Google Antigravity
- **Agent**: Google Antigravity
- **Task completed**: Performed thorough read-only repository inspection; established multi-agent workflow protocol and handoff structure in `AGENTS.md`.
- **Files changed**:
  - `AGENTS.md` (Added shared multi-agent protocol, protected area rules, catalogue conventions, and structured handoff log)
- **Tests/checks performed**:
  - `npm run test:backend` (45 backend test suites inspected; 43 passing, 2 failing due to recent upstream logic updates)
  - `git status --short` (Tracked 14 modified files and untracked reference/pipeline files from prior session)
- **Result**: Baseline architecture and state verified without any code or runtime modifications.
- **Known issues**:
  1. `backend/package.json` contains duplicate `cloudinary` dependency (`^2.11.0` and `^2.7.0`).
  2. `backend/test/staff.test.mjs` fails because `publicStaff()` now includes `permissions` which legacy assertion did not expect.
  3. `backend/test/operations.test.mjs` fails at line 31 because order completion now automatically issues a bill (`issueBill`), returning HTTP 200 instead of expected 404.
  4. `vercel.json` functions configuration includes only `backend/seed/**` and may need `data/**` for serverless phone catalogue lookups.
  5. Batch 1 phone image pipeline is paused with 10 Apple devices (20 webpage candidates recorded in `image_candidates.json` marked `needs_manual_review` awaiting direct image URL validation).
- **Recommended next step**: Await user instruction on next priority (e.g., resolving test/dependency inconsistencies or proceeding with a specific task).

### Entry: 2026-10-18 - GPT/Codex (Inventory Product Editing)
- **Agent**: GPT/Codex
- **Task completed**: Existing inventory product editing now always permits saved products to edit catalogue-derived name and brand fields, in addition to existing specifications, RAM/storage, descriptions, pricing, stock, and photos.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` (frontend TypeScript and Vite production build passed; only existing dynamic-import warnings remain).
- **Result**: Admin can edit a product after catalogue creation without being blocked by stale catalogue autofill read-only state. Existing catalogue creation flow remains unchanged.
- **Known issues**: None identified for this change.
- **Recommended next step**: Verify one catalogue-created product in Admin inventory, edit a specification and photo, save, then refresh and confirm persistence.

### Entry: 2026-10-18 - GPT/Codex (Inventory Edit Photo Hydration)
- **Agent**: GPT/Codex
- **Task completed**: Normalized the selected inventory product draft so its saved cover image is always present in the editable photo list, even when the API/cache returns only the legacy `image` field.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: Existing product photos now appear in Admin edit mode and remain removable/reorderable through the current controls.
- **Known issues**: None identified.
- **Recommended next step**: Verify a newly created product, reopen Edit, and confirm its cover photo appears before testing remove/add photo actions.

### Entry: 2026-10-18 - GPT/Codex (Used Phone Catalogue Autofill)
- **Agent**: GPT/Codex
- **Task completed**: Extended the existing catalogue selection flow to new and used phone creation. Added a used-phone field for documenting what changed, using the existing validated inspection defect storage.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; only existing Vite dynamic-import warnings remain.
- **Result**: Admin can choose Use Catalogue for a used phone, select a model/variant, autofill specs and generic image fallback, then enter condition, battery health, changes, photos, price and stock. Manual used-phone creation remains available.
- **Known issues**: None identified for this change.
- **Recommended next step**: Test one used phone with catalogue autofill and one manual used phone, including the changes field and real photos.

### Entry: 2026-10-18 - GPT/Codex (Catalogue Preview in Product Editor)
- **Agent**: GPT/Codex
- **Task completed**: Product edit photo tiles now preview the linked catalogue image when the saved product still uses the generic phone placeholder.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: Catalogue fallback images are visible during editing without being copied into the product-specific image list or changing image priority.
- **Known issues**: None identified.
- **Recommended next step**: Reopen the affected product editor and verify the catalogue image appears under Photos.

### Entry: 2026-10-18 - GPT/Codex (Used Phone Changes Field Visibility)
- **Agent**: GPT/Codex
- **Task completed**: Made the used-phone condition, battery, inspection, and “What changed in this phone?” text area visible in the compact catalogue-assisted add flow.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `frontend/src/refinement.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: Admin can enter customer-facing changes such as display replacement, battery changes, scratches, repairs, and other flaws before saving a used phone.
- **Known issues**: None identified.
- **Recommended next step**: Add a used phone using catalogue mode and confirm the changes text appears in the saved product details.

### Entry: 2026-10-18 - GPT/Codex (Catalogue Editor Close Flash)
- **Agent**: GPT/Codex
- **Task completed**: Prevented the Phone Catalogue editor Close/Cancel controls from submitting the surrounding form during modal dismissal.
- **Files changed**: `frontend/src/components/AdminPhoneCatalogue.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: Closing the catalogue editor now cancels and unmounts cleanly without a transient product-editor submission/navigation state.
- **Known issues**: None identified.
- **Recommended next step**: Refresh Admin and close a catalogue edit modal once to verify the transition.

### Entry: 2026-10-18 - GPT/Codex (Used Condition Visibility)
- **Agent**: GPT/Codex
- **Task completed**: Ensured the used-phone condition and inspection block is visible in the compact catalogue-assisted add form.
- **Files changed**: `frontend/src/refinement.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: Used-phone creation now visibly asks for condition, battery health, inspection checks, and customer-facing changes.
- **Known issues**: None identified.
- **Recommended next step**: Refresh the admin page and open Add Used Phone to verify the condition selector appears.

### Entry: 2026-10-18 - GPT/Codex (Admin Editor Close and Accessory Simplification)
- **Agent**: GPT/Codex
- **Task completed**: Added a top-right close button to product editors and simplified accessory editing by hiding duplicate advanced price/stock/specification sections while retaining name, category/type, price, stock, and photos.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `frontend/src/refinement.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; existing Vite dynamic-import warnings remain.
- **Result**: All product editor variants have an accessible close control; accessory entry no longer asks for price and stock twice.
- **Known issues**: None identified.
- **Recommended next step**: Verify accessory add/edit on desktop and mobile, then verify close button on new, used, and accessory forms.

### Entry: 2026-10-18 - GPT/Codex (Billing POS UI)
- **Agent**: GPT/Codex
- **Task completed**: Redesigned only the Admin Billing page into a responsive POS-style workspace with customer card, searchable product selection, current bill sidebar, compact quantity controls, totals, and structured issued bills.
- **Files changed**: `frontend/src/components/AdminBilling.tsx`, `frontend/src/operations.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; existing Vite dynamic-import warnings remain.
- **Result**: Existing billing APIs, stock limits, totals, issue/print flow, PDF links, and bill history remain in use. No backend or database changes.
- **Known issues**: Manual visual QA is still recommended on desktop and phone widths.
- **Recommended next step**: Test adding multiple products, quantity limits, clear/remove, issue-and-print, and Open PDF on desktop/mobile.
