# Machhapuchhree Electronics

A small shop website with a React storefront, lightweight Node backend, and owner/staff administration. The navy and slate storefront uses sky-blue accents and the owner's logo, with category navigation, simple search, account and cart in one compact desktop header. The homepage contains promotional banners and budget links. Product lists live on category pages, starting with compact search and a Filter button instead of photo banners or a sidebar. Help and Repair have separate navigation links.

Ice Cobalt (white/ice surfaces, cobalt buttons and navy text) is the default theme. The moon/sun button in storefront and admin headers switches to the earlier navy/slate/sky dark theme. The browser remembers the choice across refreshes, routes and tabs using `me-theme`; system dark mode does not override the white default. Theme setup runs before rendering to avoid a flash of the wrong palette. The same preference applies to shop, checkout and administration. If browser storage is unavailable, switching still works during the current visit.

The banner and generic phone imagery are illustrative. Actual product photos uploaded through the admin take precedence. The built-in imagegen prompts and saved asset paths are recorded in `design/reference-assets.md`.

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
- `backend/seed/products.json`: the initial 33 sample products.
- `backend/data/store.json`: current products and orders, created automatically and ignored by Git.
- `scripts/`: local development launcher and verification scripts.

## Minimum admin features

Inventory includes category filters for New phones, Used phones and Accessories, plus All categories. Counts show the catalogue total for each category. Category selection combines with search and stock-level filters; the Dashboard low-stock shortcut shows low stock across all categories.

Orders uses compact summaries with an Open order button. Full customer contacts, items, notes, email history and status controls appear only in the opened detail view. Back to orders preserves search/status/date filters. Inventory similarly opens Edit and New product in a separate editing screen instead of a side panel; saving returns to the list and keeps its filters, while leaving an unsaved draft still requires discard confirmation. These views remain inside the authenticated `/not-admin` workspace.

Only `/not-admin` opens administration; `/admin` has no login page or redirect. Sign-in opens Dashboard first. The left menu contains Dashboard, Orders and Inventory. The main admin also sees Staff logins, where they can create accounts, edit names/usernames, reset passwords, or disable and re-enable access. Staff can manage orders and inventory but cannot manage logins. Disabling or editing a staff account revokes its current sessions; re-enabling it requires a fresh sign-in. Staff passwords are salted hashes and cannot be viewed after saving. The owner login is configured from the VS Code terminal with `npm.cmd run admin:setup -- --custom`, then restart the backend. Credentials stay in ignored local configuration.

Sign in at `/not-admin`, add/edit/remove products, change price or stock quantity, upload product photos, enter specifications, view pickup orders and customer contact details, and update an order to Awaiting shop confirmation, Confirmed, Ready for pickup, Completed, or Cancelled. The overview shows pending orders, orders ready for pickup, and real listings with 0–3 units remaining; each count opens its corresponding filter. Use Refresh overview for the latest orders and stock. Admin actions are checked by the backend. Login uses a salted password hash, an HttpOnly session cookie, same-origin checks, and a basic login attempt limit.

Each product supports up to six photos. Upload several JPG, PNG, or WebP files at once, up to 5 MB each, choose the cover or remove a photo, then save the product. Customers can swipe, use thumbnails or arrow buttons, and browse with keyboard arrows. Existing single-photo products still work. Uploads are saved in `backend/data/images/` and served by the backend through `/api/images/`; they work in both development and the compiled website. Only signed-in admins can upload. Back up the full `backend/data/` folder to preserve product photos and orders. Replaced photos are retained so old order receipts keep their images.

New admin listings are real shop listings by default. Keep **Sample listing** checked for examples; existing seed products remain samples. Real listings show actual stock wording without sample price notices, and uploaded photos do not show an illustration label. Enter additional specifications one per line as `Display: 6.5 inch`. The initial sample catalogue has not been replaced with real inventory because actual products, shop prices, and photos are still needed.

The storefront reads current products from the backend. Checkout validates customer details, calculates prices from the server catalogue, saves the order, and creates a private receipt. Retrying the same request does not create a second order. Receipts keep their original product and price details even when catalogue entries are changed or removed. The customer browser retains a receipt token to refresh that order's status; the public API does not list customer orders.

Checkout now requires an email address for order updates. The backend saves an order-received message and queues another email for each actual status change. Admin shows queued, accepted and failed email attempts. Sending is disabled until a sender account is configured; setup instructions and retry behavior are in [backend/EMAIL-SETUP.md](backend/EMAIL-SETUP.md). Email failures do not discard orders. Provider acceptance is displayed separately from actual inbox delivery.

Customer accounts now connect phone login, saved name/email, checkout and My orders. Account orders are private to their owner and have status history, active/past filters and pickup guidance. Mobile cart and order empty states offer clear next steps. Guest checkout remains available. Local phone login uses an explicitly labelled development code; live SMS verification still needs a provider. See [backend/CUSTOMER-LOGIN.md](backend/CUSTOMER-LOGIN.md) for testing and production setup.

The header avatar and mobile Account button open a separate login/profile window above the current page. It keeps the current route and catalogue filters, traps keyboard focus, supports Escape/backdrop/close controls and returns focus when closed. New customers complete their profile in the same window. Direct `/login` and checkout login links continue to work as standalone routes. Help at `/help` contains shop information, Google Maps links and general enquiries; Repair at `/repair` contains phone and digital meter repair information. `/contact` redirects to Help, and legacy repair URLs redirect to matching Repair sections. Catalogue pages start with compact search/filter/sort controls, without photo banners. The top address/hours/phone strip is removed. WhatsApp shortcuts use small icon controls.

The optional Sparrow SMS adapter is wired into the backend and tested against mocked provider responses. Real delivery needs the shop's provider account/token/sender configuration; it is not active yet. Activation is covered in [backend/SMS-SETUP.md](backend/SMS-SETUP.md). Admin → Products also has a validated inventory import preview that can replace samples while preserving real listings and order receipts, with a private backup before replacement. See [backend/INVENTORY-SETUP.md](backend/INVENTORY-SETUP.md).

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
