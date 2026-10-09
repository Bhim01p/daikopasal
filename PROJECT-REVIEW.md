# Project review — 9 October 2026

The local shop website has a working order-to-pickup flow. It is not ready for public customers until real inventory, live messaging and hosting are configured.

## Completed and verified

- Responsive storefront, category/search filters, product details, cart, guest checkout and private receipts.
- Compact desktop header with navigation/search on one row and no top address/hours/phone strip; homepage banners and budget links without product listings or service/sidebar sections. Catalogue photo banners are removed; smaller desktop search and filter controls start new phones, used phones and accessories pages.
- Help at `/help` contains store details and Google Maps links; Repair at `/repair` contains both repair services. Legacy contact/repair URLs redirect appropriately. Avatar opens a login/profile overlay that preserves the current page and filters, with keyboard focus, Escape and backdrop closing verified.
- Custom admin credentials can be entered through hidden terminal prompts with `npm.cmd run admin:setup -- --custom`. Passwords are saved only as salted hashes; existing SMS/email settings are preserved. The actual owner login has not been rotated.
- Private Sparrow SMS setup/check commands and shared verification challenges, attempts and sessions are prepared. Two-app-instance tests pass with a simulated transactional store. No provider credentials or real handset delivery are available yet.
- Customer phone-code login, saved profile details, account checkout, private My orders and status history. Local preview uses development codes; the production SMS path was tested with a mock provider.
- Admin product editing, up to six photo uploads with cover/removal controls, quantities and order updates. Customers can swipe galleries or use thumbnails, buttons and keyboard arrows.
- Admin overview with pending orders, ready-for-pickup orders and real low-stock listings; counts open matching filters. Samples are excluded from stock counts.
- Mobile cart/order empty states, active/past order filters, status guidance and larger shopping controls.
- Server-side prices, stock reservations, last-unit contention, safe order retries, cancellation restocking once, and closed completed/cancelled orders.
- Inventory file validation and preview; replacing samples preserves real listings, receipts and accounts. Private full-store backups are saved before replacement. A stale preview is rejected when the catalogue changes.
- Optional Sparrow SMS adapter, backend-only credentials, HTTPS POST, redacted errors, no code exposure in SMS mode, and bounded verification attempts.
- Order-confirmation and status email queue, persistent retries, failure handling and provider acceptance reporting. Actual sending is still disabled.
- Neon database connection and Gmail SMTP authentication verified with the private deployment settings. Isolated real-Neon tests passed cross-instance admin sessions, concurrent last-unit ordering, private receipts, order/photo persistence after app recreation and a complete pickup lifecycle. No live emails were sent; the disposable test schema was removed.
- Deployment preparation includes the missing Vite TypeScript declaration, an authenticated scheduler fallback, bounded serverless email batches and secret-safe environment setup. Production build and all 23 backend tests pass. The owner asked to perform configuration/commit/push personally; those external changes remain pending. See [DEPLOYMENT.md](DEPLOYMENT.md).
- Full isolated browser flow: inventory import → local test login → saved-profile checkout → Confirmed → Ready for pickup → Completed. A second guest order tested last-unit purchase and cancellation. Each step retained the expected stock, receipt and notification history.
- Corrected completed/cancelled receipt instructions and real-product WhatsApp totals.
- Four-width storefront/account layouts and seven-width phone typography/touch checks. These are emulated browser checks, not physical device tests.
- Production dependency audit reported zero known advisories. This is a dependency check, not a full security audit.

## Waiting for shop information or accounts

| Priority | Item                         | What is needed                                                                                                                                                                                                        |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Actual catalogue replacement | Real names, prices in NPR, quantities, phone specifications/condition/battery and photos. The actual store still has 33 samples and 0 real listings; QA fixtures were never imported into it.                         |
| 1        | Activate real SMS            | Choose the provider; obtain the account, sender identity, private API token and credits. Sparrow wiring is available; another provider needs its adapter. Confirm code delivery on phones/networks the shop supports. |
| 1        | Activate order emails        | Gmail app password saved privately; SMTP authentication passes. Upload Vercel environment settings and verify real order/status emails in the intended recipient inbox. |
| 1        | Public deployment            | Vercel CLI authenticated and existing project linked; Neon tests pass. Owner will configure environments, commit and push the latest code. Hosted acceptance checks remain pending; commercial launch requires Vercel Pro. |
| 2        | Shop content                 | Real logo, exact map pin, social links and shop-approved warranty, returns/cancellation and privacy information.                                                                                                      |
| 2        | Final live acceptance test   | Use verified inventory, a phone and email controlled by the shop, check SMS arrival, order confirmation email, every status email and pickup completion.                                                              |

## Implementation limits to address when publishing

Local development still uses the JSON file store. The Vercel adapter uses Neon for inventory, orders, sessions, challenges, rate limits and uploaded photo bytes; row locks serialize mutations across instances. This simple whole-store design fits a small prototype and should be replaced with separate relational tables if traffic/data grows. The adapter uses Vercel's trusted `x-real-ip`; verify hosted forwarding and cookie behavior before launch. Review provider quotas and alerts when activating paid SMS. The daily scheduler fallback can delay idle-site retries; use a more frequent schedule on Pro for commercial operation.

Product galleries support up to six photos; actual shop photos are still needed. The contact form prepares a WhatsApp enquiry rather than saving support tickets, which matches the current small-shop scope.

Email provider acceptance does not prove inbox delivery; bounce/delivery webhooks are a future improvement. Review pending messages before enabling sending so older test messages are not sent by mistake. Demo accounts/orders created outside the isolated QA store should be removed before launching.

Payments/eSewa and delivery remain deferred by the user. Current orders use shop pickup and payment arranged with the shop.

## Evidence and setup guides

`npm run build` and 18 backend tests passed, including custom credential hashing/settings preservation, shared SMS challenge/attempt/session behavior, gallery validation, receipt snapshots, restart persistence and local Nepal phone numbers beginning with 977. The interactive hidden password prompts were checked with dummy inputs without changing the owner login. The updated `ui-refinement-checks.json` verifies compact catalogue search without banners, removal of the top strip, separate Help/Repair routes, redirects and overlay flow across 320–1920-pixel layouts. The phone typography/touch/navigation/checkout check also passes at seven widths. Other saved browser reports cover earlier gallery, inventory and order lifecycle flows; they were not all rerun for this UI change. Backend and browser checks use separate test stores; real SMS, inbox delivery and hosted database behavior were not tested.

- [Inventory setup](backend/INVENTORY-SETUP.md)
- [SMS activation](backend/SMS-SETUP.md)
- [Email setup](backend/EMAIL-SETUP.md)
- [Remaining tasks](TASKS.md)
