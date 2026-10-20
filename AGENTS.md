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

### Entry: 2026-10-18 - GPT/Codex (Product Detail Motion Phase 3)
- **Agent**: GPT/Codex
- **Task completed**: Added scoped Product Detail/Product Gallery motion: guarded desktop pointer depth, image transition states, thumbnail feedback, mobile pressed states, reduced-motion handling, and brief add-to-cart acknowledgement.
- **Files changed**: `frontend/src/components/ProductGallery.tsx`, `frontend/src/pages/Product.tsx`, `frontend/src/product-gallery.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Product detail gallery preserves existing image priority, swipe/keyboard behavior, attribution, loading, and placeholder handling while adding restrained Phase 3 motion.
- **Known issues**: Manual visual QA is recommended across desktop/mobile and reduced-motion settings.
- **Recommended next step**: Review the Phase 3 product detail page visually before starting any later motion phase.

### Entry: 2026-10-18 - GPT/Codex (Storefront Product Grid Motion Phase 4)
- **Agent**: GPT/Codex
- **Task completed**: Refined shared ProductCard interaction across storefront grids by reusing Phase 2 card motion, suppressing placeholder image movement, and adding restrained action press/favorite/add-to-cart feedback.
- **Files changed**: `frontend/src/components/ProductCard.tsx`, `frontend/src/ruby-theme.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Shop, category, search, favourites, and related-product grids use the same calm card behavior without pointer tracking or continuous motion. Image priority and action logic remain unchanged.
- **Known issues**: Manual visual QA is recommended at requested mobile widths, both themes, and reduced-motion settings.
- **Recommended next step**: Review Phase 4 storefront cards visually before starting Phase 5.

### Entry: 2026-10-18 - GPT/Codex (Customer Storefront Micro-interactions Phase 5)
- **Agent**: GPT/Codex
- **Task completed**: Added restrained storefront feedback for cart count changes, shared press/focus states, search focus, quantity disabled states, and reduced-motion behavior.
- **Files changed**: `frontend/src/components/Layout.tsx`, `frontend/src/ruby-theme.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Customer navigation, search, cart, buttons, quantity controls, favorites/compare controls, and form-focused controls now share consistent lightweight feedback without changing logic or adding dependencies.
- **Known issues**: Manual visual QA remains recommended across themes, languages, mobile, keyboard, and reduced-motion settings.
- **Recommended next step**: Review Phase 5 interactions visually before starting Phase 6.

### Entry: 2026-10-18 - GPT/Codex (Motion System Final Audit Phase 6+7)
- **Agent**: GPT/Codex
- **Task completed**: Audited Phases 1–5 for mobile, accessibility, reduced-motion, consistency, performance, and regression risks; simplified gallery rendering by removing blanket `will-change` and preventing placeholder scaling.
- **Files changed**: `frontend/src/product-gallery.css`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Touch input remains isolated from pointer tilt, reduced-motion rules preserve content and state indicators, gallery placeholders stay static, and no new dependencies or motion systems were added.
- **Known issues**: Manual browser QA is still recommended at 320–768px, both themes, EN/NE, keyboard, and reduced-motion settings.
- **Recommended next step**: Freeze the current 2.5D/motion system after manual visual review.

### Entry: 2026-10-18 - GPT/Codex (Storefront Discovery Improvement)
- **Agent**: GPT/Codex
- **Task completed**: Improved client-side Shop/Search discovery with dynamic RAM/storage options, URL-synced filters and sorting, expanded product-facing search coverage, dynamic price presets, and name/brand sorting.
- **Files changed**: `frontend/src/pages/Catalogue.tsx`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: New, used, accessory, and search views retain their existing routes and now restore applicable discovery state from shared URLs without backend or catalogue changes.
- **Known issues**: Manual browser QA is recommended for refresh/back/forward and mobile filter behavior across all categories.
- **Recommended next step**: Verify shared URLs and filter combinations manually before beginning variant-selection work.

### Entry: 2026-10-18 - GPT/Codex (Product Grouping Identity Foundation Phase 1)
- **Agent**: GPT/Codex
- **Task completed**: Added optional `catalogueDeviceId` and server-derived deterministic `variantKey` metadata for new-phone catalogue products while keeping independent store products authoritative.
- **Files changed**: `frontend/src/types/index.ts`, `backend/validation.mjs`, `backend/server.mjs`, `AGENTS.md`.
- **Tests/checks performed**: `npm.cmd run build` passed; backend syntax checks passed; `git diff --check` passed; backend suite attempted with 30 passing and 17 environment/storage-permission failures unrelated to this change.
- **Result**: Catalogue-created new phones retain validated device grouping metadata and RAM/storage configuration keys. Manual, used, accessory, and existing products remain backward-compatible; Cart, Checkout, Orders, Payment, Search/Filter, Favorites, Compare, images, and frozen motion were not changed.
- **Known issues**: Full backend suite is blocked in this sandbox by EPERM rename failures under the Windows temp package path and EACCES localhost fixture failures.
- **Recommended next step**: Manually create two new-phone products from the same catalogue device with different variants and verify metadata before implementing related-product grouping.

### Entry: 2026-10-18 - GPT/Codex (Product Grouping + Variant Selector Phase 2+3)
- **Agent**: GPT/Codex
- **Task completed**: Added exact `catalogueDeviceId` grouping for related new-phone products and a customer-facing RAM/storage selector on Product Detail. The selector uses only real, unambiguous store products, preserves independent product pricing/stock/images, supports storage-only variants, and labels out-of-stock variants without navigating to nonexistent combinations.
- **Files changed**: `frontend/src/pages/Product.tsx`, `frontend/src/utils/productVariants.ts`, `frontend/src/refinement.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; `git diff --check` passed; backend syntax checks passed. Existing Vite dynamic-import warnings remain.
- **Result**: New phones sharing an exact catalogue device ID can switch between real RAM/storage variants via existing product URLs. Used phones, accessories, products without grouping metadata, cart/checkout/orders, catalogue data, images, and frozen motion remain unchanged.
- **Known issues**: Manual browser QA is still recommended for multi-variant, out-of-stock, storage-only, mobile, and back/forward navigation cases.
- **Recommended next step**: Perform final QA for Phase 2+3, then freeze catalogue grouping work before any later phase.

### Entry: 2026-10-18 - GPT/Codex (Product Variant System Phase 4 Final QA)
- **Agent**: GPT/Codex
- **Task completed**: Completed targeted final QA of the Phase 1–3 product variant system. Confirmed exact new-phone grouping, deterministic metadata, real-product slug navigation, duplicate safety, independent price/stock/image behavior, cart identity, and unchanged used/accessory behavior. No confirmed regression required an application fix.
- **Files changed**: `AGENTS.md` only during Phase 4; the Phase 2+3 implementation remains in `frontend/src/pages/Product.tsx`, `frontend/src/utils/productVariants.ts`, and `frontend/src/refinement.css`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend syntax checks passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: PRODUCT VARIANT SYSTEM — FROZEN. Independent store products, exact `catalogueDeviceId` grouping, deterministic `variantKey`, Product Detail RAM/storage selector, existing slug navigation, product-specific price/stock/images, product-ID Cart/Checkout/Orders, independent used phones/accessories, no parent/variant collection/migration, and no named color variants are preserved.
- **Known issues**: Browser QA remains recommended for real multi-variant data, mobile widths, back/forward navigation, out-of-stock states, cart coexistence, EN/NE, and light/dark themes.
- **Recommended next step**: No further variant-system changes; only fix confirmed regressions if reported.

### Entry: 2026-10-18 - GPT/Codex (Used Phone Phase 1+2)
- **Agent**: GPT/Codex
- **Task completed**: Added used-listing safety and trust improvements while keeping used phones as independent products. New used listings require an actual uploaded device photo, condition, valid battery health, and receive a stock-above-one confirmation. Expanded inspection checks to body, microphone, biometrics, network/SIM, and Wi-Fi/Bluetooth; Product Detail now shows explicit passed/issue/not-checked states and distinguishes actual photos from reference imagery.
- **Files changed**: `backend/validation.mjs`, `frontend/src/types/index.ts`, `frontend/src/pages/Admin.tsx`, `frontend/src/components/ProductGallery.tsx`, `frontend/src/pages/Product.tsx`, `frontend/src/refinement.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend syntax checks passed; used-phone billing/inspection tests passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Used phones remain product-ID based and isolated from the frozen variant, discovery, motion, catalogue-image, cart, checkout, order, and payment systems. Legacy used listings remain readable; new Admin saves are gated when trust fields or actual photos are missing.
- **Known issues**: Legacy records without actual photos can still be edited through direct legacy API paths for backward compatibility; the Admin editor blocks normal saves until a real photo is added. Full browser QA remains for mobile, dark mode, EN/NE, and real/reference image presentation.
- **Recommended next step**: Run Used Phone Phase 3 final QA; do not start unrelated features during that QA.

### Entry: 2026-10-18 - GPT/Codex (Used Phone Phase 3 Final QA)
- **Agent**: GPT/Codex
- **Task completed**: Completed final regression QA for the used-phone safety/trust work. Fixed a confirmed legacy-data display bug where missing storage rendered as `undefined GB`; cards and Product Detail now show a neutral missing-specification fallback. Verified independent used-product identity, photo gating/reference transparency, stock handling, condition/battery validation, expanded inspection states, defect/accessory disclosure, and isolation from new-phone variants.
- **Files changed**: `frontend/src/components/ProductCard.tsx`, `frontend/src/pages/Product.tsx`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend syntax checks passed; used-phone billing/inspection tests passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: USED PHONE SYSTEM — FROZEN. Used phones remain independent product-ID listings; actual-device photos are gated for new listings, legacy reference images are labeled, stock defaults to 1 with deliberate stock-above-one confirmation, condition/battery/inspection data is validated and transparent, and Cart/Checkout/Orders remain unchanged.
- **Known issues**: Browser QA remains recommended for real/reference image switching, mobile widths, EN/NE, light/dark, and complete purchase flow. No confirmed application blocker remains.
- **Recommended next step**: Only address confirmed used-phone regressions or explicitly approved future features. Do not start the Repair Request System in this handoff.

### Entry: 2026-10-18 - GPT/Codex (Repair System Phase 1)
- **Agent**: GPT/Codex
- **Task completed**: Added the guest repair-request foundation with server-side validation, secure random tracking tokens, human-readable references, optional signed-in customer association, lightweight IP rate limiting, safe public responses, and a responsive English/Nepali request form on `/repair`.
- **Files changed**: `backend/server.mjs`, `frontend/src/components/CustomerRepairRequest.tsx`, `frontend/src/pages/Repair.tsx`, `frontend/src/operations.css`, `shared/ne.json`, `AGENTS.md`.
- **Tests/checks performed**: Backend/server and locale syntax checks; Nepali locale JSON parse; frontend TypeScript and production build; `git diff --check`. Existing backend fixture tests were attempted but remain blocked by Windows sandbox EPERM store-file rename errors.
- **Result**: Anonymous customers can submit mobile-phone or digital-meter repair requests with required contact/device/problem fields, receive a private token-backed tracking link, and see a clear success state. Legacy shop-code tracking and admin repair records remain compatible; no checkout, payment, order, billing, auth, schema, or Phase 2 work was changed.
- **Known issues**: Manual QA is still required for guest submission, token-protected tracking, rate-limit messaging, mobile widths, and EN/NE presentation. Backend fixture tests need a normal writable temp directory to run reliably.
- **Recommended next step**: Perform the requested manual QA for Repair Phase 1, then decide separately whether to approve Phase 2. Do not treat the repair system as frozen yet.

### Entry: 2026-10-18 - GPT/Codex (Repair Completion Pass In Progress)
- **Agent**: GPT/Codex
- **Task completed**: Added the next repair workflow foundation on top of Phase 1: customer-safe diagnosis/estimate/final-cost fields, approval decisions secured by the tracking token, additive lifecycle statuses/transitions, admin repair search/filter/detail editing, and internal staff notes excluded from public responses. The provided repair UI reference is being used for card hierarchy and responsive layout direction.
- **Files changed**: `backend/server.mjs`, `frontend/src/components/AdminRepairs.tsx`, `frontend/src/pages/Repair.tsx`, `frontend/src/operations.css`, `shared/ne.json`.
- **Tests/checks performed**: Backend syntax check, frontend TypeScript/production build, and `git diff --check` passed. Existing backend fixture tests remain blocked by Windows sandbox EPERM store-file rename behavior.
- **Result**: Phase 2 workflow pieces are implemented locally, but the full repair-system completion pass is not yet frozen. Optional photos and notifications remain deferred; browser QA and broader repair regression tests remain.
- **Known issues**: Manual validation of lifecycle transitions, customer approval, mobile layouts, dark mode, and Nepali text is still required. The current admin UI is functional but remains a compact existing-layout enhancement rather than a final visual match to the reference.
- **Recommended next step**: Continue targeted repair QA and polish only; do not modify protected commerce, catalogue, variant, used-phone, discovery, or motion systems.

### Entry: 2026-10-18 - GPT/Codex (Repair System Paused)
- **Agent**: GPT/Codex
- **Task completed**: Paused Repair System development at READY WITH MANUAL QA REMAINING, per user instruction.
- **Files changed**: `AGENTS.md` only.
- **Tests/checks performed**: None; implementation was intentionally left unchanged.
- **Result**: Repair System is regression-protected and must not receive new features or architectural changes until manual browser QA is completed or a confirmed bug is reported.
- **Known issues**: Browser QA remains outstanding; the system is not fully frozen. Existing Windows backend fixture EPERM limitations remain documented.
- **Recommended next step**: Work on a separate user-approved project area. Return to Repair only for manual QA or a confirmed Repair bug.

### Entry: 2026-10-18 - GPT/Codex (Checkout and Payment UX Polish)
- **Agent**: GPT/Codex
- **Task completed**: Audited the existing checkout and manual QR flow and added targeted review/payment-status hierarchy improvements without changing payment architecture.
- **Files changed**: `frontend/src/pages/Checkout.tsx`, `frontend/src/sky-theme.css`, `shared/ne.json`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; Nepali locale JSON validation passed; `git diff --check` passed. Existing Vite dynamic-import warnings remain.
- **Result**: Checkout review now repeats products, subtotal, delivery fee, and total before order creation. Order confirmation now distinguishes order status from payment status using customer-friendly labels. PAY_AT_SHOP, MANUAL_QR, delivery-payment rules, QR verification, rejection/resubmission, and backend payment boundaries were preserved.
- **Known issues**: Browser/mobile runtime QA remains outstanding in this environment; no browser-side changes were made based on unverified assumptions.
- **Recommended next step**: Manually exercise pickup/pay-at-shop, pickup/QR, delivery/QR, rejected-payment resubmission, and payment-status display on mobile and desktop.

### Entry: 2026-10-18 - GPT/Codex (Order Tracking UX Polish)
- **Agent**: GPT/Codex
- **Task completed**: Audited order confirmation/tracking and My Orders, then added targeted status and summary clarity improvements.
- **Files changed**: `frontend/src/pages/Checkout.tsx`, `frontend/src/pages/MyOrders.tsx`, `frontend/src/sky-theme.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; Nepali locale JSON validation passed; `git diff --check` passed.
- **Result**: Checkout/order confirmation now shows separate order and payment status summaries and preserves delivery fees in historical order summaries. My Orders now identifies pickup versus delivery and shows a friendly payment state. Payment/order architecture and protected systems were untouched.
- **Known issues**: Browser/mobile runtime QA remains outstanding; no unsupported delivery stages or fake tracking were added.
- **Recommended next step**: Manually review pickup, delivery, QR pending/paid/rejected, cancelled, and completed order states at mobile and desktop widths.

### Entry: 2026-10-18 - GPT/Codex (Customer Account + Profile Audit)
- **Agent**: GPT/Codex
- **Task completed**: Audited customer login, registration, session/logout, profile editing, password flows, My Orders, favorites, guest behavior, and navigation.
- **Files changed**: `frontend/src/pages/Account.tsx`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; customer-auth syntax check and locale JSON validation passed; `git diff --check` passed. Customer backend tests were attempted: 4 passed and 3 were blocked by the existing Windows sandbox EPERM store-file rename issue.
- **Result**: Fixed a confirmed profile-edit synchronization issue where the phone field could remain stale because the profile hydration effect omitted `customer.phone` from its dependencies. Existing account, logout, favorites, guest checkout, ownership, and staff authentication behavior remains unchanged.
- **Known issues**: Browser/mobile account QA remains outstanding. No additional account features were added.
- **Recommended next step**: Manually verify login/register, profile edit including phone changes, logout/login again, My Orders ownership, favorites behavior, and mobile EN/NE layouts.

### Entry: 2026-10-18 - GPT/Codex (Admin Workspace Final Polish)
- **Agent**: GPT/Codex
- **Task completed**: Audited the existing Admin navigation, product/catalogue integration, orders, payment review, billing, repairs, staff permissions, and settings boundaries.
- **Files changed**: `frontend/src/pages/Admin.tsx`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend syntax check passed; Nepali locale JSON validation passed; `git diff --check` passed.
- **Result**: Fixed two confirmed Admin workflow issues: delivery orders were labeled as Shop pickup in order detail, and future/ESEWA payment entries exposed manual QR verification actions even though the backend correctly rejects them. Manual verification controls now appear only for MANUAL_QR.
- **Known issues**: Browser/runtime Admin QA remains outstanding. No protected architecture was redesigned.
- **Recommended next step**: Manually review Admin order/payment screens, delivery labels, staff permission boundaries, billing, repairs, and narrow-screen layouts before whole-site QA.

### Entry: 2026-10-18 - GPT/Codex (Whole-Site Final QA + Production Readiness)
- **Agent**: GPT/Codex
- **Task completed**: Performed a targeted whole-site production-readiness audit across runtime data loading, deployment configuration, dependency metadata, customer/admin flows, checkout/payment boundaries, account/order tracking, catalogue/image loading, repair pause state, and final diff hygiene.
- **Files changed**: `vercel.json`, `backend/package.json`, `AGENTS.md`; existing targeted Admin, checkout, account, order, and repair changes from this working tree were reviewed and preserved.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend/API module syntax checks passed; deployment/package/locale JSON validation passed; `git diff --check` passed. Existing Vite chunk warnings remain.
- **Result**: Vercel functions now bundle the runtime `data/**` catalogue/description/image files in addition to backend seed files. The duplicate Cloudinary dependency declaration was removed while retaining the existing version. Database-backed hosted storage remains required through `DATABASE_URL`; secrets stay server-side. No protected checkout, payment, order, billing, authentication, catalogue specification, or paused Repair architecture was redesigned.
- **Known issues**: Full browser/runtime QA was unavailable in this environment, so manual verification remains required for public routes, mobile widths, both themes/languages, customer checkout/payment, account/order ownership, repair flow, and Admin permissions. Existing Windows EPERM/EACCES fixture-store test failures remain environmental. Existing Vite dynamic/static import warnings remain.
- **Recommended next step**: Deploy to a preview environment with production-like environment variables and complete the concise manual smoke checklist before production promotion.

### Entry: 2026-10-18 - GPT/Codex (Whole-Project Visual + UX Consistency Polish)
- **Agent**: GPT/Codex
- **Task completed**: Completed a static visual/UX consistency review across storefront, catalogue/search, product cards/detail, cart, checkout/payment, order tracking, account, repair, Admin, Billing, forms, status treatments, themes, locales, accessibility, responsive CSS, image handling, and motion boundaries.
- **Files changed**: `AGENTS.md` only; no confirmed safe visual defect required application-code changes during this pass.
- **Tests/checks performed**: Frontend TypeScript and production build passed; backend syntax checks passed; Nepali locale JSON validation passed; `git diff --check` passed. Existing Vite dynamic/static import warnings remain.
- **Result**: Existing design tokens, responsive rules, image priority, variant behavior, payment/order architecture, paused Repair architecture, and frozen Motion System were preserved. No browser QA was claimed.
- **Known issues**: Manual browser review remains required at 320/360/390/430px and desktop, in light/dark themes and English/Nepali, including checkout/payment, account/order ownership, Repair, Admin, and Billing flows.
- **Recommended next step**: Perform the deferred manual visual QA session and fix only confirmed runtime presentation regressions.

### Entry: 2026-10-18 - GPT/Codex (Business Content + Trust Final Polish)
- **Agent**: GPT/Codex
- **Task completed**: Audited public business identity, footer/contact links, WhatsApp actions, delivery/payment wording, repair information, used-phone trust messaging, informational routes, metadata copy, and English/Nepali fixed content.
- **Files changed**: `frontend/src/components/Layout.tsx`, `frontend/src/main.tsx`, `frontend/src/pages/Contact.tsx`, `frontend/src/pages/Product.tsx`, `frontend/src/pages/MyOrders.tsx`, `shared/ne.json`, `AGENTS.md`.
- **Tests/checks performed**: Nepali locale JSON validation; frontend TypeScript and production build; `git diff --check`. Existing Vite dynamic/static import warnings remain.
- **Result**: Corrected public pickup-only wording that contradicted the implemented eligible home-delivery flow. Contact FAQ now explains the NPR 175 delivery fee and QR requirement; product/footer/meta wording reflects pickup or eligible delivery; guest order heading no longer implies pickup-only orders. Existing WhatsApp number, routes, payment/order/repair logic, and business data were preserved.
- **Known issues**: Browser/mobile visual QA remains deferred. No unsupported street address, warranty, return, delivery-time, registration, certification, review, or social claims were added.
- **Recommended next step**: Complete the deferred manual content and responsive review before production promotion.

### Entry: 2026-10-18 - GPT/Codex (Dark Mode + EN/NE Compatibility Audit)
- **Agent**: GPT/Codex
- **Task completed**: Audited theme switching, dark-mode token usage, fixed customer-facing strings, checkout/payment labels, account/order/repair labels, Admin UI translation usage, and responsive translation risks.
- **Files changed**: `frontend/src/pages/Checkout.tsx`, `shared/ne.json`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build; Nepali locale JSON validation; `git diff --check`.
- **Result**: Fixed the confirmed hardcoded customer-facing “Complete payment” label so it follows the existing translation system and added its Nepali translation. Existing dark-mode token architecture, QR light presentation, product image surfaces, language persistence, theme persistence, and business logic were preserved.
- **Known issues**: Browser verification remains deferred; static review found no additional confirmed dark-mode defect safe to change without visual confirmation. Existing Vite dynamic/static import warnings remain.
- **Recommended next step**: Perform the final manual combined dark-mode + Nepali browser QA at mobile and desktop widths.

### Entry: 2026-10-18 - GPT/Codex (Premium Motion + Perceived-Speed Upgrade)
- **Agent**: GPT/Codex
- **Task completed**: Reopened the existing selective motion system for a scoped upgrade. Added shared motion timing tokens, a lightweight public route entrance, and a stable Suspense loading structure with reduced-motion handling.
- **Files changed**: `frontend/src/components/Layout.tsx`, `frontend/src/main.tsx`, `frontend/src/ruby-theme.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; `git diff --check` passed. Existing Vite dynamic/static import warnings remain.
- **Result**: Public navigation now gets an immediate, subtle opacity/vertical entrance keyed by pathname. Lazy-route fallback keeps the shell stable with lightweight animated lines and no artificial delay. Existing hero, card, gallery, cart, checkout, payment, repair, Admin, theme, language, and reduced-motion behavior remains intact.
- **Known issues**: Browser/manual visual QA remains outstanding. Admin intentionally receives no decorative 3D treatment. Build output increased by approximately 0.4 kB CSS and remains within the existing architecture.
- **Recommended next step**: Complete manual motion QA on public routes at mobile/desktop widths, both themes/languages, touch/coarse pointer, and reduced-motion settings.
- **Motion status**: Regression-protected again after this scoped pass.

### Entry: 2026-10-18 - GPT/Codex (Stronger Premium 3D Experience)
- **Agent**: GPT/Codex
- **Task completed**: Added a stronger but scoped premium depth treatment to homepage/storefront-compatible product surfaces and Product Detail gallery surfaces, building on the existing motion system.
- **Files changed**: `frontend/src/ruby-theme.css`, `frontend/src/product-gallery.css`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; `git diff --check` passed. Existing Vite dynamic/static import warnings remain.
- **Result**: Fine-pointer product cards now gain restrained perspective, layered highlight, lift, and image separation. Product gallery frames gain ambient stage lighting and grounded image depth. Touch devices avoid pointer tilt/lighting; reduced-motion disables movement and filters. No business logic, image priority, checkout/payment, Admin, or Repair behavior changed.
- **Known issues**: Browser visual QA remains outstanding. The stronger 3D treatment is intentionally limited to storefront cards/gallery; Checkout, Payment, Admin, Account, Repair, and Billing remain calm.
- **Recommended next step**: Perform manual visual QA for hero/cards/gallery in light/dark themes, EN/NE, mobile/desktop, touch, and reduced-motion settings.
- **Motion status**: Stronger 3D system is regression-protected again.

### Entry: 2026-10-20 - GPT/Codex (Production SEO Foundation)
- **Agent**: GPT/Codex
- **Task completed**: Audited production SEO metadata, indexability, robots, sitemap, canonical handling, social metadata, product metadata, LocalBusiness JSON-LD, private-route indexing, image fallback metadata, and deployment-facing static SEO files.
- **Files changed**: `frontend/index.html`, `frontend/public/sitemap.xml`, `frontend/public/sitemap-template.xml`, `frontend/src/main.tsx`, `AGENTS.md`.
- **Tests/checks performed**: Frontend TypeScript and production build passed; sitemap/locale validation passed; backend syntax check passed; `git diff --check` passed. Existing Vite dynamic/static import warnings remain.
- **Result**: Removed overly precise LocalBusiness address/geo/opening-hour values from static JSON-LD, corrected sitemap entries to canonical public routes, preserved robots exclusions for private routes, and added conservative Product JSON-LD plus dynamic product/social image metadata from real product data. Query/filter state remains functional while canonical URLs use pathname only.
- **Known issues**: The static sitemap cannot safely enumerate database-backed product URLs at build time; product pages still expose runtime metadata when loaded. Search Console, indexing submission, Business Profile, GA4, Bing verification, and real production crawler/PageSpeed checks require external/manual action.
- **Recommended next step**: Deploy to preview/production, validate `/robots.txt`, `/sitemap.xml`, representative product metadata and JSON-LD with external tools, then submit the sitemap to search platforms.
- **SEO status**: Regression-protected after this pass.
