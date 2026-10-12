# Pending project tasks

## Approved workflow batch — 12 October 2026

Scope: owner authorized queue items 1–13. Items 14 (backup/recovery guidance) and 15 (mobile improvements/testing) are explicitly deferred. Do not start either without new instructions. The owner reported order emails working and had pushed the previous build to main; the changes in this batch are local and await the owner's review/commit. No deployment or credential changes belong to this batch.

- [x] 1. Separate admin sidebar entries for New phones, Used phones and Accessories, with category-specific product lists and matching defaults for New product.
- [x] 2. Dedicated URL-backed staff/product creation and editing pages, with list/back navigation, direct reload support and unsaved-change guards. Order detail pages now have URLs too. Compact order lists remain.
- [x] 3. Verify owner-only staff administration, staff order/product access, disabled-session revocation and private credentials. Backend permission tests also cover staff product creation/edit/deletion.
- [x] 4. Homepage category carousel, one slide every three seconds, category links, pause/play and manual controls. Pause on hover/focus and respect reduced-motion preference. Footer immediately follows; budget prices and other homepage sections removed.
- [x] 5. Help redesign: order/WhatsApp/call actions, compact location/hours, FAQs and expandable enquiry form with saved profile autofill. Guest tracking opens receipts stored in the original browser.
- [x] 6. Side-by-side desktop phone/digital meter repair cards with compact descriptions and contact actions.
- [x] 7. Header search gives the input and button separate space so the English placeholder fits.
- [x] 8. Login shows a fixed +977 prefix, accepts a local 10-digit number or a pasted full number, supports Nepali digits, and sends a normalized number. Disabled mode explicitly says SMS login unavailable. Live SMS activation still requires the separate provider setup/handset test below.
- [x] 9. Native cart dialog from header/dock, with quantities/removal/total/checkout, Escape/outside close, focus restoration and scroll locking. Standalone cart URL remains available.
- [x] 10. Checkout shows pickup-only, supplied full address, hours, wait-for-ready/bring-reference guidance and cancellation information. Cancellation fees depend on product/timing/preparation/labour; the shop must explain and agree a specific fee before confirmation. Website does not calculate or charge fees. Warranty terms remain pending.
- [x] 11. Receipt shows reference/items/total and a Track order action leading to live-refreshed progress. Guest receipts are accessible from My orders in the original browser.
- [x] 12. Failed product photos show a deliberate placeholder in cards/gallery/thumbnails/cart/admin, recovering when the image source changes.
- [x] 13. Location and directions links use the supplied plus code/address (43MM+778, Lekhnath, Gandaki Province 33700), with the supplied Google Maps listing name displayed. Link destination/encoding checked. Independent verification of the business's exact Google place pin remains pending: Google Maps was not accessible through the lookup tool. No unverified place ID or coordinates were invented.

Validation: production build and 543-message translation coverage pass. All 24 backend tests pass. Isolated desktop workflow checks cover carousel timing/pause/category navigation, Help/form/links, side-by-side repair visibility, search fit, cart/checkout/guest receipt tracking, 10-digit test login, photo fallback, category defaults, page reloads, staff creation/sign-in and owner-only access. No live SMS/email, shop orders or inventory were used. Dedicated mobile testing remains deferred.


## Compact admin lists and white-theme accents — 9 October 2026

Completed: Orders shows compact reference/date/customer/item-count/total/status rows. Open order displays full contacts, items, notes, email history and status controls in a separate detail view; Back to orders retains the list filters. Inventory lists products without a side editor. Edit and New product open a dedicated editing view, with Back to inventory, save/cancel and existing unsaved-change protection. Successful saves return to the filtered inventory list.

The white theme now adds an amber/yellow cart icon and count, purple profile accent, warm theme toggle and mint Filter button. These accents are scoped to the light palette.

Verification: production build and translation check passed. Isolated desktop browser checks covered compact summaries, detail-only controls, status progression, completion confirmation, keeping details open after status/filter changes, inventory editing/saving, retained category selection, unsaved changes and new-product/back flow. Mobile testing and deployment remain paused.

## Cart notification contrast — 9 October 2026

Fixed the add-to-cart confirmation toast and dismiss icon to use the chosen theme's surface/text/border/accent. Production build passed; isolated desktop checks confirmed at least 4.5:1 text/icon contrast in both palettes and working dismissal. Mobile checks and deployment remain paused.

## Dark-mode fixes and inventory categories — 9 October 2026

Completed: Help/Repair headings, contact/map/prepared-message panels, empty cart and order states, selected/unselected My orders filters, active search summary and account-window close button now use the selected theme palette. Inventory has All categories, New phones, Used phones and Accessories buttons with counts, combined with search and low-stock filtering. The dashboard low-stock shortcut resets category selection to show all low-stock products.

Verification: production build and 495-message translation check passed. Isolated desktop checks measured at least 4.5:1 contrast for affected text in both themes, verified the profile window, and confirmed category product membership, combined search, low-stock and reset behavior. No real customer/order records or outbound messages were used. Mobile checks and deployment remain paused.

## Light/dark theme choice — 9 October 2026

Completed: approved Ice Cobalt is the default white theme; the previous navy/slate/sky palette remains as the dark theme. Moon/sun controls appear in the storefront, admin login and admin dashboard. A shared browser preference survives navigation and refreshes, synchronizes between tabs and falls back gracefully when storage is unavailable. Both English and Nepali switch labels are included.

Verification: production build and 493-message translation check passed. Desktop browser checks verified both palettes on shop/category/help/repair/cart/checkout/admin pages, default white even with a dark system preference, saved choices, cross-tab sync, and disabled-storage fallback. Desktop screenshots were inspected. Mobile checks remain deferred; deployment remains paused.

## Owner theme and staff administration — 9 October 2026

Completed locally: navy/slate/sky-blue theme, supplied `logo.png`, admin access at `/not-admin` only, Dashboard first, left menu for Orders and Inventory, and owner-only Staff logins. Owner credentials remain configurable through the VS Code terminal (`npm.cmd run admin:setup -- --custom`). Staff can manage orders/inventory; the owner creates, edits, resets passwords and disables logins. Password hashes and session revocation are enforced by the backend. English/Nepali translations include the new screens.

Verification: production build and 24 backend tests passed; isolated desktop browser checks covered dashboard navigation, creating/signing in as staff, owner-only menu, loaded logo and page layouts. Mobile verification is deferred at the user's request. Deployment remains paused; no commit or push was performed.

## Deployment preparation — 9 October 2026

Status: The owner resumed setup, saved the private Neon connection and Gmail app password, authorized Vercel CLI sign-in, then asked to perform the Git push personally to learn. The workspace is linked to the existing `machhapuchhreeelectronics` project. No environment variables were uploaded and no new deployment or Git commit/push was made by this work.

- [x] Verify Neon connection and initialize the separate shop schema (33 sample products, no orders or queued messages).
- [x] Verify Gmail SMTP authentication without sending email.
- [x] Verify isolated Neon concurrency, cross-instance admin sessions, last-unit stock reservation, private receipts, order/photo persistence after app recreation, complete pickup lifecycle and notification queuing. Temporary test schema removed.
- [x] Include the missing Vite TypeScript declaration, shared translations and latest UX files in the files awaiting commit. Local production build passes.
- [x] Add authenticated scheduled email fallback, bounded processing batches and hosted development-OTP protection. All 23 backend tests pass.
- [x] Add explicit Vercel root/build/output instructions and a secret-safe `npm run deploy:configure` command. Private environment files and `.vercel` credentials excluded from Git and Vercel uploads.
- [ ] Owner: run `npm run deploy:configure`, review/stage changes, commit and push `main`.
- [ ] Verify the new hosted build and real order/status inbox delivery; customer SMS remains disabled until configured.

Step-by-step guide: [DEPLOYMENT.md](DEPLOYMENT.md). Vercel Hobby is limited to personal non-commercial use; commercial launch requires Pro. Daily scheduler fallback can delay idle-site retries; Pro supports a more frequent schedule.

## Nepali/English and usability review

Status: Implemented after the user's approval. English/Nepali switching now covers customer/admin interface text and validation, with saved choices, Devanagari typography, Nepali phone/OTP digits and optional Nepali descriptions. Customer search, pickup checkout, login recovery, cards and order progress were refined. Admin now has intentional order actions, close-order confirmation, search/status/date filters, grouped editing, structured specifications, sticky save/cancel, unsaved-edit protection, quick stock updates and notification/service summaries. Catalogue banners and the top contact strip remain removed.

Validation: production build, 20 backend tests, 450 static translation messages, responsive browser checks in both languages and an isolated order/product lifecycle. Details: [UX-REVIEW.md](UX-REVIEW.md). Real inventory/photos, live SMS/email and deployment remain pending below. Nepali product content uses the supplied English description until the owner adds a translation.

## Requested changes — started at the user's instruction on 9 October 2026

The user authorized the six queued changes and live SMS setup. Gmail and deployment remain paused.

1. Remove the photo banner between the navbar and catalogue search controls on New phones, Used phones, Accessories and other pages using this layout.
2. Make the catalogue search bar smaller and more compact on these pages.
3. Remove the top strip showing “Lekhnath, Pokhara, Nepal · Open 8 AM–6 PM” and the phone number across the website. Keep contact information on Contact & Help.
4. Rename the Contact & Help page and its navigation label to Help. Keep the store contact/location details and general enquiry form there.
5. Add a Repair navigation button and a separate Repair page. Move the Phone repair section (description, inspection note, common repair enquiries and contact actions) and Digital meter repair section (description, inspection note and contact actions) from Help to Repair. Remove these sections from Help after moving them.
6. Allow the owner to set a custom admin username and password privately on the laptop. Current setup generates a random password; implement this later with the queued changes.

Status: Items 1–6 implemented. Catalogue banners and top strip removed; desktop search reduced; Help and Repair split; private custom admin setup added. Build, 18 backend tests and desktop/mobile browser checks pass. To enter the owner's chosen credentials, run `npm.cmd run admin:setup -- --custom` and restart the backend. Existing credentials were not changed by this work.

Completed: added the supplied address, `43MM+778, Lekhnath, Gandaki Province 33700`, and Google Maps search/directions links using the supplied listing name. A verified place pin/embedded map remains pending.

The user is back home and has asked to resume the saved setup tasks. Real inventory replacement, live SMS activation, email setup and the final live order test can proceed as the required shop information and service accounts become available. Prepared implementation and QA results are saved.

## Replace demo catalogue with shop inventory

Status: Ready for setup — quantity tracking, order reservation, cancellation restocking and a validated import preview with private backups are implemented. Awaiting verified shop inventory.

- [ ] Provide real product names, prices, photos and specifications.
- [ ] Enter quantities available for new orders in admin; existing reservations are already deducted.
- [ ] Replace or remove the sample listings and their demo quantities before publishing.

Guide: [backend/INVENTORY-SETUP.md](backend/INVENTORY-SETUP.md).

## Connect customer order emails

Status: Resumed for preparation on 9 October 2026. Gmail app credentials are saved privately and SMTP authentication passes. Live recipient inbox delivery and hosted testing remain unverified. The owner will upload environment settings and push the updated code using the guide above. The Resend checklist below is an alternative, not the current selected setup.

The email feature is implemented and tested with mocked sending. Checkout collects an email address; new orders queue an order-received email; actual admin status changes queue updates. Hosted sending is awaiting environment configuration and an inbox test. Payment gateway work remains deferred.

- [ ] Confirm whether the shop already owns a domain and can edit its DNS records.
- [ ] Create a Resend account and verify the sending domain/subdomain.
- [ ] Choose the shop sender address and optional reply-to inbox.
- [ ] Create a sending API key and enter it privately in the existing `backend/.env`, preserving the admin settings.
- [ ] Configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, and optional `EMAIL_REPLY_TO`.
- [ ] Review pending notification messages before enabling sending, then restart the backend.
- [ ] Place a test order using an email address the user controls; verify the order-received email arrives.
- [ ] Change that order's status in admin; verify the status update email arrives and check the provider logs.

Detailed guide: [backend/EMAIL-SETUP.md](backend/EMAIL-SETUP.md).

This is a saved checklist. No timed reminder or automatic laptop-presence trigger is configured.

## Connect live SMS phone verification

Status: Item 9 is authorized; integration is prepared and tested, including shared challenge/attempt/session behavior across two hosted app instances. No sender or token is present in the workspace. Live SMS activation and handset delivery remain pending the owner's provider account, approved sender, token and credits. Do not label this task complete without a real handset test.

- [ ] Choose a Nepal SMS provider and create its account/sender configuration.
- [x] Implement and wire the optional Sparrow SMS adapter.
- [x] Add private `npm.cmd run sms:setup` and a non-sending `npm.cmd run sms:check` command. Other admin/email settings are preserved.
- [ ] Configure the chosen account's sender/token privately, or adapt another provider if needed.
- [ ] Enable `CUSTOMER_AUTH_MODE=sms`, with development login disabled in production.
- [ ] Verify real code delivery, expiration, resend limits and customer order access on the supported networks.

Testing guide: [backend/SMS-SETUP.md](backend/SMS-SETUP.md).

## Public launch and final live order test

Status: Awaiting setup — the complete order lifecycle passes in an isolated QA store, with local codes and email queuing. The final live order test follows real inventory and messaging activation.

- [ ] Choose domain/hosting and configure HTTPS, production settings and persistent storage/backups.
- [ ] Verify real SMS receipt and order/status emails with a shop-controlled phone and email.
- [ ] Complete a real pickup test using verified inventory.
- [ ] Add the real logo, exact map pin, social links and shop-approved policies.
- [x] Add a product gallery with up to six uploads, cover controls and mobile swipe navigation.
- [x] Add pending/ready order counts and real low-stock filters to admin.
- [x] Improve mobile cart/My orders empty states and add active/past order filters.

Progress and implementation limits: [PROJECT-REVIEW.md](PROJECT-REVIEW.md).

## Desktop bug batch — 12 October 2026
- [x] Remove slider buttons; support swipe/drag and arrow keys.
- [x] Full-width slider fills the viewport below the header.
- [x] Autoplay continues when hovered or focused; reduced-motion preference respected.
- [x] Separate temporary images for all three categories.
- [x] Shop category dropdown and Account/My orders menu simplify the header.
- [x] Compact desktop cart window, item images and summary.
- Mobile overhaul and backups remain paused. No deployment or push in this batch.
- Validation: production build, Nepali translation coverage, desktop browser slider/menu/cart/checkout checks and diff whitespace checks passed.

## Mobile layout — 12 October 2026
- [x] Compact phone header with full-width search; Shop submenu and language/theme settings in the menu.
- [x] Viewport slider sized above the bottom navigation with readable copy and phone-friendly images.
- [x] Stack Help, repair, filters, cart and summary layouts; readable form inputs and touch controls.
- [x] Theme-aware phone header and bottom navigation contrast.
- [x] Checked widths 320, 390, 430 and 768; mobile pickup test order, guest tracking, login input and authenticated admin inventory/staff/editor screens passed using isolated QA data.
- No deployment, commit or push. Backups remain deferred.

## Owner priorities — 12 October 2026
- Owner will handle commit/push, production settings, real inventory and remaining shop details.
- Hosted order/email verification removed from active queue: owner reports repeated successful checks.
- Live SMS provider setup remains pending; discuss account/sender/token/credits and real handset verification.
- Backups deferred for budget; payments deferred for future work. Mobile improvements completed above.

## Deferred together: owner approval for SMS and SQL backups

- [ ] Present SMS login running costs and provider options to the shop owner; wait for approval before purchasing credits, creating a paid plan or enabling live SMS.
- [ ] Confirm quote: OTP/API access, sender approval/setup fees, tax, minimum top-up/monthly billing, credit expiry, NTC/Ncell coverage, resend/failed-send billing and delivery support.
- [ ] After approval, configure provider credentials privately and verify real handset delivery; current Sparrow adapter is prepared, but another provider requires an adapter change.
- [ ] Plan and set up Neon/PostgreSQL backups and restore procedure later; confirm retention, frequency, off-site export, access and restore test. Product photo backup must be considered separately from SQL data.

Owner briefing (pricing checked 12 October 2026): Sparrow requires a volume-based quote; some sender-ID packages have minimum monthly usage. EK SMS publishes NPR 0.90 per SMS credit plus 13% VAT for up to 10,000 monthly credits, with no monthly/setup fees. This is a pricing comparison, not a tested integration or endorsement. One segment per OTP gives approximately NPR 102/100, NPR 509/500 or NPR 1,017/1,000 messages including VAT; resends and longer messages can increase usage. NTC consumer SIM packs do not connect directly to the current website. NTC's separate web bulk portal lists NPR 0.50/SMS excluding tax at 2,000 messages/3 months but automatic OTP API suitability is unconfirmed. Private-company SMS Alert lists minimum 3,000 monthly billed messages at NPR 0.50 each before tax and minimum NPR 500,000 deposit/bank guarantee plus NPR 100,000 per Alert ID. Confirm all terms directly before payment.

Sources: https://sparrowsms.com/faqs/ ; https://sms.ekrasunya.com/pricing ; https://www.ntc.net.np/services/sms-based-vas-services
No purchase, SMS activation or SQL backup setup performed. Guest checkout remains available while SMS login is disabled.
