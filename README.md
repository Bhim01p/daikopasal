# Machhapuchhree Electronics

A small shop website with a React storefront, Node backend, PostgreSQL/Neon hosting support and owner/staff administration. The current design uses white and burgundy/red, with a matching dark theme and English/Nepali interfaces. The homepage has a three-second category slider and a Favourites tab; category pages have compact search/filter controls. Help and Repair are separate pages.

The browser remembers light/dark and language preferences. New manufacturer-sourced catalogue records carry temporary estimated prices and no asserted stock until the owner confirms quantities. Source details, comparison/EMI behavior, safe migration and the current verification commands are recorded in the 13 October update section below.

## Start locally

Use Node.js **22.12 or newer** (Node 24 is installed on this machine).

```sh
npm install
npm run admin:setup
npm run dev
```

Storefront: `http://127.0.0.1:8767/` · Admin: `http://127.0.0.1:8767/not-admin` · Backend: `http://127.0.0.1:3001/`.

The admin is already configured on this machine. Open `backend/ADMIN-ACCESS.txt` for the generated local username and password. The password hash lives in ignored `backend/.env`, and the access file is also ignored. Running setup again preserves the current login. Choose your own username and password with `npm.cmd run admin:setup -- --custom`; enter a 3–40 character username and a password of at least 12 characters in the private terminal prompts. Custom passwords are stored only as a salted hash and are not copied into the access file. To generate a random password, use `npm.cmd run admin:setup -- --reset`. Restart the backend after either change. Active sessions expire after eight hours; changing credentials invalidates old sessions when the backend restarts.

To run each side separately:

```sh
npm run dev:backend
npm run dev:frontend
```

Run those two commands in separate terminals from the project root. Alternatively, open one terminal in `frontend/` and another in `backend/`, and run `npm run dev` in each. Choose either the combined root command or the two separate commands; launching both duplicates the servers and causes port conflicts. If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of changing the machine's execution policy. Stop an existing dev server with Ctrl+C before starting another. The frontend uses port 8767 and the backend uses port 3001.

To run the compiled website from the backend:

```sh
npm run build
npm start
```

Then use `http://127.0.0.1:3001/` and `/not-admin`. The backend serves app routes, images, and API requests together. Development uses Vite's `/api` proxy.

## Folders

- `frontend/src/`: storefront pages, admin page, cart, API client, product context, and desktop/mobile styles.
- `frontend/src/data/shop.ts`: shop name, WhatsApp number, location, and opening hours.
- `frontend/public/assets/`: bundled illustrative product images.
- `backend/server.mjs`: API, authentication, and compiled frontend serving.
- `backend/validation.mjs`: input validation and allowed order statuses.
- `backend/store.mjs`: atomic local JSON persistence.
- `backend/seed/products.json`: the eight sourced starter listings with temporary estimated prices and zero stock.
- `backend/data/store.json`: current products and orders, created automatically and ignored by Git.
- `scripts/`: local development launcher and verification scripts.

## Minimum admin features

The admin sidebar has separate New phones, Used phones and Accessories pages. Each page lists that category and defaults New product to it. Search and stock-level filters still apply; the Dashboard low-stock shortcut shows low stock across all categories.

Orders uses compact summaries with an Open order button. Full customer contacts, items, notes, email history and status controls appear only in the opened detail page. Back to orders preserves search/status/date filters. Products and staff logins have separate list/create/edit URLs, with reload/back navigation and unsaved-change protection. Product saves return to the category list. All pages remain inside the authenticated `/not-admin` workspace: `/not-admin/new-phones`, `/not-admin/used-phones`, `/not-admin/accessories`, `/not-admin/staff`, and `/not-admin/orders`, with `/create` or a record ID for the corresponding detail pages.

Only `/not-admin` and its child routes open administration; `/admin` has no login page or redirect. The root opens Dashboard; direct page URLs remain available after sign-in. The left menu contains Dashboard, Orders, New phones, Used phones and Accessories. The main admin also sees Staff logins, where they can create accounts, edit names/usernames, reset passwords, or disable and re-enable access. Staff can manage orders and inventory but cannot manage logins. Disabling or editing a staff account revokes its current sessions; re-enabling it requires a fresh sign-in. Staff passwords are salted hashes and cannot be viewed after saving. The owner login is configured from the VS Code terminal with `npm.cmd run admin:setup -- --custom`, then restart the backend. Credentials stay in ignored local configuration.

The homepage shows a three-second category carousel followed by the footer. Header cart access opens a modal with quantity/removal and checkout controls; `/cart` remains a standalone route. Help includes quick actions, FAQs, supplied location/directions and an expandable WhatsApp enquiry form. Guest receipts saved in the original browser appear in My orders and refresh their status when opened. Checkout includes pickup instructions and the owner's cancellation policy; any specific cancellation fee must be discussed and agreed before order confirmation, and is not charged automatically. Email-code login uses the configured mail transport; SMS is not used. Desktop checks: `node scripts/verify-workflow-queue.cjs` against the isolated QA server on port 8773. Mobile layouts have been checked; backup/recovery work remains deferred.

Sign in at `/not-admin`, add/edit/remove products, change price or stock quantity, upload product photos, enter specifications, view pickup orders and customer contact details, and update an order to Awaiting shop confirmation, Confirmed, Ready for pickup, Completed, or Cancelled. The overview shows pending orders, orders ready for pickup, and real listings with 0–3 units remaining; each count opens its corresponding filter. Use Refresh overview for the latest orders and stock. Admin actions are checked by the backend. Login uses a salted password hash, an HttpOnly session cookie, same-origin checks, and a basic login attempt limit.

Each product supports up to six photos. Upload several JPG, PNG, or WebP files at once, up to 5 MB each, choose the cover or remove a photo, then save the product. Customers can swipe, use thumbnails or arrow buttons, and browse with keyboard arrows. Existing single-photo products still work. Uploads are saved in `backend/data/images/` and served by the backend through `/api/images/`; they work in both development and the compiled website. Only signed-in admins can upload. Back up the full `backend/data/` folder to preserve product photos and orders. Replaced photos are retained so old order receipts keep their images.

New listings are real products by default. Use the temporary estimated-price checkbox only until the shop price is confirmed. Enter actual stock quantities and check the exact variant against the linked specification source. Add descriptions/specification rows and optional EMI terms in the dedicated product editor.

The storefront reads current products from the backend. Checkout validates customer details, calculates prices from the server catalogue, saves the order, and creates a private receipt. Retrying the same request does not create a second order. Receipts keep their original product and price details even when catalogue entries are changed or removed. The customer browser retains a receipt token to refresh that order's status; the public API does not list customer orders.

Checkout now requires an email address for order updates. The backend saves an order-received message and queues another email for each actual status change. Admin shows queued, accepted and failed email attempts. Sending is disabled until a sender account is configured; setup instructions and retry behavior are in [backend/EMAIL-SETUP.md](backend/EMAIL-SETUP.md). Email failures do not discard orders. Provider acceptance is displayed separately from actual inbox delivery.

Customer accounts connect email-code login, saved name/phone details, checkout and private My orders. Guest checkout remains available. See [backend/CUSTOMER-LOGIN.md](backend/CUSTOMER-LOGIN.md) for configuration, existing-account migration and verification.

The header avatar and mobile Account button open a separate login/profile window above the current page. It keeps the current route and catalogue filters, traps keyboard focus, supports Escape/backdrop/close controls and returns focus when closed. New customers complete their profile in the same window. Direct `/login` and checkout login links continue to work as standalone routes. Help at `/help` contains shop information, Google Maps links and general enquiries; Repair at `/repair` contains phone and digital meter repair information. `/contact` redirects to Help, and legacy repair URLs redirect to matching Repair sections. Catalogue pages start with compact search/filter/sort controls, without photo banners. The top address/hours/phone strip is removed. WhatsApp shortcuts use small icon controls.

SMS sender creation and setup commands have been removed from the application. Inventory import remains available with validation and preservation of existing products and receipts.

Stock quantity means units available for **new** orders, excluding units already reserved. Each order reserves its quantities in the same saved operation as the order; retries do not reserve twice. Quantities cannot exceed current stock, and product/bag controls respect it. A stock change adjusts the bag with a notice. Zero units means out of stock. Cancellation returns reserved units once if the listing still exists; completed and cancelled orders are closed and cannot be reopened. A completed pickup keeps its units deducted. Returns after pickup need a separate shop process and are not implemented here.

Older sample listings start with 10 demo units when marked available, or 0 when unavailable. These are examples, not real inventory. Older real listings without a count are unavailable until a quantity is entered in admin. Older orders did not reserve units, so cancelling them does not invent returned stock. Product editing checks the stock version and refuses a stale form that could overwrite a newer order reservation. Reopen the product in admin to review its current quantity before saving.

Cart items still persist in the browser. Orders now appear directly in the admin area; WhatsApp is available for pickup confirmation and enquiries. Shop pickup only, with no delivery or online payment. Products, prices, conditions, battery values, and images remain examples. Logo, exact map, warranty policies, and social links are pending. There are no staff roles, analytics, payment gateway, or complex database.

The JSON store is intended for one local backend process. Back up `backend/data/store.json` before changing or moving it. Browser verification uses a separate QA store and does not modify shop data or send messages. A hosted database and HTTPS configuration can be added when publishing is requested.

## Checks

```sh
npm run build
npm run test:backend
```

Backend checks use an isolated temporary server and store. They verify authentication, protected product changes, server-side pricing, private receipts, retry behavior, stock reservation and cancellation, simultaneous last-unit requests, stale admin edits, legacy inventory migration, order status changes, and persistence across restart.

For optional browser checks, use a separately installed Playwright runtime. Set `PLAYWRIGHT_MODULE` to its module path if needed and `CHROME_PATH` to an installed Chrome executable. Start the isolated compiled preview with `node scripts/qa-server.mjs`; set `PREVIEW_URL=http://127.0.0.1:8770`, then run:

```sh
node scripts/verify.cjs
node scripts/verify-mobile.cjs
node scripts/verify-admin.cjs
node scripts/verify-customer.cjs
node scripts/verify-ui-refinement.cjs
```

For the complete inventory-to-pickup check, start a second fresh QA store with `QA_PORT=8771` and `QA_DATA_FILE` pointing to a new file inside `qa-results/`. Set `PREVIEW_URL=http://127.0.0.1:8771` and run `node scripts/verify-order-lifecycle.cjs`. It imports synthetic fixtures into that isolated store, verifies account checkout, Confirmed → Ready for pickup → Completed, email queuing, and a guest cancellation. It does not replace actual shop inventory or test real SMS/inbox delivery.

Results and screenshots are saved in `qa-results/`. Mobile checks cover text sizes, 44-pixel shopping controls, 16-pixel inputs, navigation, and checkout from 320 to 767 pixels. These are browser-emulated checks, not physical device certification.

The UI refinement check covers the single-row desktop header without a top contact strip, compact catalogue search without banners, all category filter panels, separate Help/Repair pages and legacy redirects, overlay login/profile/logout, focus/closing controls and preservation of the underlying route and filters. Layouts are checked from 320 to 1920 pixels.

`node scripts/verify-shop-improvements.cjs` requires its own fresh isolated QA store (default URL port 8771). It creates temporary listings/orders and checks multiple photo uploads, cover changes/removal, native touch swiping, keyboard navigation, overview filters/counts, exclusion of sample stock, customer privacy, active/past orders and layouts at 320, 390, 768 and 1440 pixels. Email and SMS transports are disabled in the QA server.

Before publishing, replace sample products, set a real domain in `frontend/public/sitemap-template.xml`, rename it to `sitemap.xml`, add its URL to `robots.txt`, and decide on hosted data storage and secure deployment. Nothing is published by this project setup.

Vercel + Neon instructions, including the repository root, `npm run build`, `frontend/dist`, private environment setup and Git push steps, are in [DEPLOYMENT.md](DEPLOYMENT.md). Run `npm run deploy:check` for non-sending service authentication checks, `npm run deploy:test` for isolated Neon order/photo checks, and `npm run deploy:configure` to upload settings to the linked Vercel project. The last command changes remote settings; it does not deploy code.

## Burgundy update — 13 October 2026

- Light and dark burgundy/red storefront/admin design, mobile navigation and responsive catalogue/forms.
- Home Favourites tab and product hearts; favourites are stored in this browser, not synchronized between devices.
- `/compare` compares two saved manufacturer/reference or shop models. Redmi 9 Nepal and Redmi 10 Global reference facts were manually checked on their linked Xiaomi pages. There is no AI, paid comparison API, general web crawler or automatic claim that an unsupported model is known. Add verified source URL, exact variant and specifications in admin to expand inventory comparisons.
- Product editor has optional EMI terms: annual rate, reducing/flat interest, minimum down payment, allowed periods and upfront fee. Eligible product pages show an estimate; fees are paid upfront, not financed. EMI is off by default and does not constitute a finance application or loan approval.
- Eight manufacturer-sourced listings replace untouched starter examples: four new-phone models, two used-phone reference listings and two accessories. Temporary prices are marked as estimates and stock starts at zero until the owner verifies units. Used condition and battery health require inspection. Bundled images come from linked manufacturer product pages; owner photos should replace reference imagery for actual used units.
- A one-time catalogue migration matches only untouched legacy entries. It preserves owner-edited products, uploaded photos, receipts, accounts and sessions and retains removed starter records privately for recovery. It does not wipe production orders or invent inventory.
- Email-code login replaces SMS. See `backend/CUSTOMER-LOGIN.md`. Local private Gmail configuration is prepared; Vercel needs `CUSTOMER_AUTH_MODE=email` plus its existing Gmail settings. `SMS_PROVIDER=disabled` remains appropriate. No deployment occurred during this update.

Current verification: `npm.cmd run build`, `npm.cmd run test:backend`, `node scripts/check-translations.cjs`. The current isolated UI harness is `scripts/qa-ruby-server.mjs` plus `scripts/verify-ruby-update.cjs` and `scripts/verify-ruby-visual.cjs` (Playwright/Chrome environment variables required). Historical verification scripts below describe earlier versions and are not the current release's browser acceptance suite.
