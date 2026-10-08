# Project review — 8 October 2026

The local shop website has a working order-to-pickup flow. It is not ready for public customers until real inventory, live messaging and hosting are configured.

## Completed and verified

- Responsive storefront, category/search filters, product details, cart, guest checkout and private receipts.
- Compact desktop header with navigation/search on one row; homepage banners and budget links without product listings or service/sidebar sections. Category intros use photo banners, with filters opened beside search on new phones, used phones and accessories.
- Contact & Help combines shop information and both repair services, with legacy repair URLs redirected to matching sections. Avatar opens a login/profile overlay that preserves the current page and filters, with keyboard focus, Escape and backdrop closing verified.
- Customer phone-code login, saved profile details, account checkout, private My orders and status history. Local preview uses development codes; the production SMS path was tested with a mock provider.
- Admin product editing, up to six photo uploads with cover/removal controls, quantities and order updates. Customers can swipe galleries or use thumbnails, buttons and keyboard arrows.
- Admin overview with pending orders, ready-for-pickup orders and real low-stock listings; counts open matching filters. Samples are excluded from stock counts.
- Mobile cart/order empty states, active/past order filters, status guidance and larger shopping controls.
- Server-side prices, stock reservations, last-unit contention, safe order retries, cancellation restocking once, and closed completed/cancelled orders.
- Inventory file validation and preview; replacing samples preserves real listings, receipts and accounts. Private full-store backups are saved before replacement. A stale preview is rejected when the catalogue changes.
- Optional Sparrow SMS adapter, backend-only credentials, HTTPS POST, redacted errors, no code exposure in SMS mode, and bounded verification attempts.
- Order-confirmation and status email queue, persistent retries, failure handling and provider acceptance reporting. Actual sending is still disabled.
- Full isolated browser flow: inventory import → local test login → saved-profile checkout → Confirmed → Ready for pickup → Completed. A second guest order tested last-unit purchase and cancellation. Each step retained the expected stock, receipt and notification history.
- Corrected completed/cancelled receipt instructions and real-product WhatsApp totals.
- Four-width storefront/account layouts and seven-width phone typography/touch checks. These are emulated browser checks, not physical device tests.
- Production dependency audit reported zero known advisories. This is a dependency check, not a full security audit.

## Waiting for shop information or accounts

| Priority | Item                         | What is needed                                                                                                                                                                                                        |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Actual catalogue replacement | Real names, prices in NPR, quantities, phone specifications/condition/battery and photos. The actual store still has 33 samples and 0 real listings; QA fixtures were never imported into it.                         |
| 1        | Activate real SMS            | Choose the provider; obtain the account, sender identity, private API token and credits. Sparrow wiring is available; another provider needs its adapter. Confirm code delivery on phones/networks the shop supports. |
| 1        | Activate order emails        | Sending-domain access, verified sender, private Resend key and a real recipient test. Order emails currently queue but have not reached a real inbox.                                                                 |
| 1        | Public deployment            | Domain and hosting choice, HTTPS, production environment, secure cookies, persistent data/backups and recovery checks. Local preview addresses only work on the machine running the server.                           |
| 2        | Shop content                 | Real logo, exact map pin, social links and shop-approved warranty, returns/cancellation and privacy information.                                                                                                      |
| 2        | Final live acceptance test   | Use verified inventory, a phone and email controlled by the shop, check SMS arrival, order confirmation email, every status email and pickup completion.                                                              |

## Implementation limits to address when publishing

The JSON data store and in-memory verification/rate-limit state support one backend process. Hosting must preserve `backend/data/`; multiple instances need shared inventory/session/challenge/rate-limit storage. Behind a reverse proxy, current limits see the socket address rather than the customer's IP. Configure trusted forwarding for the chosen hosting setup before public use; never trust arbitrary forwarded headers. Review provider quotas and alerts as part of activating paid SMS.

Product galleries support up to six photos; actual shop photos are still needed. The contact form prepares a WhatsApp enquiry rather than saving support tickets, which matches the current small-shop scope.

Email provider acceptance does not prove inbox delivery; bounce/delivery webhooks are a future improvement. Review pending messages before enabling sending so older test messages are not sent by mistake. Demo accounts/orders created outside the isolated QA store should be removed before launching.

Payments/eSewa and delivery remain deferred by the user. Current orders use shop pickup and payment arranged with the shop.

## Evidence and setup guides

`npm run build` and 16 backend tests passed, including gallery validation, receipt snapshots, restart persistence and local Nepal phone numbers beginning with 977. Browser reports are saved under `qa-results/`: `admin-checks.json`, `checks.json`, `mobile-checks.json`, `customer-checks.json`, `order-lifecycle-checks.json`, `shop-improvements-checks.json` and `ui-refinement-checks.json`. The UI refinement check covers desktop header alignment and compact controls, category filters, help redirects and overlay login/profile/logout, preserving route/filter state and keyboard focus across 320–1920-pixel layouts. The gallery/overview checks include native touch swiping, cover/removal uploads, order metrics, low-stock exclusion of samples, account privacy and active/past orders at four widths. Backend and browser checks use separate test stores; real SMS and inbox delivery were not tested.

- [Inventory setup](backend/INVENTORY-SETUP.md)
- [SMS activation](backend/SMS-SETUP.md)
- [Email setup](backend/EMAIL-SETUP.md)
- [Remaining tasks](TASKS.md)
