# Pending project tasks

## Current update — 13 October 2026

Owner approved the burgundy/red reference redesign, both themes, mobile layouts, favourites, sourced two-phone comparison, EMI estimates and email-code login. The later instruction replaces generic testing products with manufacturer-sourced models and removes customer-facing test features.

- [x] Shared burgundy/red light/dark design across storefront and admin; compact two-row desktop navigation and responsive mobile layouts.
- [x] Home Favourites tab, product hearts, browser persistence and direct removal.
- [x] Two-model specification table, variant labels, source links, differences-only filter and unknown-model handling. Reference library starts with official Redmi 9 Nepal and Redmi 10 Global data; shop models use admin-supplied specifications/source URLs. No AI, paid API or unrestricted live web scraping.
- [x] Optional product EMI terms in admin and customer calculator: minimum down payment, allowed periods, annual rate, reducing/flat method, upfront fee and estimated total. Terms disabled until the shop configures them.
- [x] Gmail/email-code login, expiry/single-use/attempt limits, resend cooldown, IP/identity/global limits and verified-email lock. Unique existing customer emails preserve account IDs/orders; duplicate emails require manual assistance. Guest orders are not silently merged.
- [x] Remove SMS sender creation from deployed application, SMS setup commands and customer test-code UI. Existing legacy authentication regression fixtures are isolated from real email sending.
- [x] Replace untouched starter examples with eight sourced models across the three categories; preserve owner-edited products/uploads, receipts/accounts/sessions. Manufacturer images are bundled locally. Temporary prices are marked; stock starts at zero and used condition/battery require inspection.
- [x] Local private Gmail/login settings prepared without printing credentials or sending live messages.
- [x] Build, 30 backend tests, translation coverage, end-to-end mock-email order flow and layout checks at 320/390/768/1024/1440 pixels passed. Final light/dark previews inspected. Admin is loaded separately to reduce the initial bundle.
- [ ] Owner: confirm actual prices/stock/used-unit condition and applicable EMI terms before selling.
- [ ] Owner: set CUSTOMER_AUTH_MODE=email in Vercel Production/Preview, keep existing Gmail settings and SMS_PROVIDER=disabled, then deploy the new commit. Verify one real inbox login. No environment upload, Git commit/push or deployment performed here.
- SQL backup/recovery and payment gateway remain deferred. SMS is removed from planned scope.


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

## Deferred colour preference — next update
- [ ] Apply the owner's latest colour reference: white background, charcoal/dark-grey navigation and text, light-grey surfaces, and bright pink/magenta accents for active navigation, buttons, links and highlights.
- Reference: C:/Users/USER/AppData/Local/Temp/codex-clipboard-80c85bce-34be-40d3-8dba-6329ba9cc293.png (user attached 12 October 2026).
- This request is for the colour palette only; preserve the current approved layout and flows. Clarify dark-theme treatment when implementation resumes.
- Deferred at the owner's request due to credit limits. No UI changes, commit or deployment performed for this item.

## Whole-flow audit — 13 October 2026
- Re-ran production build, 803-message translation coverage and all 30 backend tests successfully.
- Fresh isolated browser store: email login/profile, signed-in checkout, favourites, comparison, EMI/admin settings, themes/languages and phone/tablet/desktop layouts passed.
- Separate guest mobile checkout: invalid submission, quantity/total, stock reservation, receipt reload, guest tracking, admin Confirmed/Ready/Completed and four notification records passed. Mock mail only.
- Staff UI creation/reload/login, order access, owner-only administration and disabled-session revocation passed.
- Neon integration passed in its own temporary schema: cross-instance sessions, last-unit concurrency, private receipts, image/order persistence, pickup lifecycle and persistent notification queue. Temporary schema removed; no shop test orders or live emails.
- Read-only live check: production deployment Ready, public API/routes healthy, customer auth mode already email. Nine live catalogue entries, one currently orderable, eight with estimated prices. No production settings changed.
- Found and fixed locally: used-phone editor displayed Good while its condition was unset. It now shows Inspection pending and requires an explicit selection. Browser verification passed; regression added to the current UI harness.
- The audit's small editor correction and test update are not committed/pushed. Real Gmail OTP inbox delivery remains untested by the agent; SQL backups and payments remain deferred.

## Mobile homepage preview — 13 October 2026
- Local review preview: phone-only 374–390px slide cards with clear text above a contained product image; diagonal gradient removed on phones.
- Phone footer replaced by compact contact/hours/directions, WhatsApp shortcut and expandable Shop/Help sections. Unfinished social labels and excess footer spacing hidden on phones.
- Desktop footer and slider remain unchanged: light/dark full-page screenshots match pixel-for-pixel before and after.
- Build and translations pass; browser checks cover all slides at 320/390/430, both themes, image/text bounds, no horizontal scrolling, accordion links and directions.
- Screenshots saved under ignored qa-results/mobile-home-compact-* and mobile-footer-compact-*. Awaiting owner review. No commit, push or deployment performed for this preview.

Mobile homepage follow-up: slider fills initial phone viewport between header/tabs and bottom dock; footer revealed on scroll. Desktop rules unchanged. Build passed; checked 390px width at 667/844/932px heights, footer begins behind dock with no horizontal overflow. Local only, not published.

## CSV phone comparison catalogue — 13 October 2026

- [x] Preserve original owner-supplied CSV and import dictionary/report in the repository.
- [x] Validate all 31 columns, unique IDs, numeric/boolean/date fields, HTTPS sources and RFC CSV quoting before import.
- [x] Prepare 83 configurations / 50 models, preserving the two existing manufacturer references (85 total reference configurations).
- [x] Keep references separate from stock/products/orders; revision-based idempotent migration supports local files and existing Neon JSONB architecture.
- [x] Add public reference catalogue endpoint; search second phone by brand/model/configuration and filter brand, while first dropdown remains shop phones. Preserve legacy reference comparison URLs.
- [x] Show exact variants, all sources/check dates, absent fields and source-linked reference labels; no invented prices or purchasable reference products.
- [x] Phone/desktop light/dark, Nepali, no-result state, API failure/retry, URL reloads and table swipe hint.
- [x] Backend regression: 34/34 pass, including isolated database migration/API coverage. Browser checks passed at 320/390/1440 widths, both themes and Nepali.
- [ ] Publish through the normal deployment when requested. No live database connection, Git push or deployment performed for this task. Next deployment activates the catalogue migration; no new environment variables are needed.

Data accuracy note: the supplied report and CSV source-check dates are retained; source specifications have not all been independently researched again. Future CSV updates use scripts/import-phone-csv.mjs; see docs/phone-reference-import.md.

### Pre-push flow check — 13 October 2026

- Build and 815 interface translation checks pass; backend tests 34/34 pass.
- Fresh isolated browser checks pass: admin phone editing and used condition validation, EMI setup/calculation, rotating homepage, favourites, comparison, email OTP/profile with mock delivery, signed-in checkout and order tracking.
- CSV comparison passes search/variant/source/no-data/retry/reload/legacy link flows at 320/390/1440 widths, both themes and Nepali. Broader shop smoke checks cover 320/390/768/1024/1440.
- Bundled seed exactly matches all 83 CSV rows plus 2 existing manufacturer references; Vercel function packaging includes the seed.
- Git whitespace check passes. Private environment/admin credential files and QA artifacts remain ignored.
- Ready for commit/push. No Git commit, push, deployment, real Gmail delivery or live Neon migration performed during this check.

## Pending mobile/shop fixes — queued 13 October 2026

User explicitly requested listing only. Do not implement until the user says to start.

1. Compare page: fix the zoomed-out mobile layout shown in the supplied screenshots (content shrinks to the left with a large blank area on the right). User requests preventing zoom; assess the actual overflow/viewport cause and explain browser/accessibility implications before choosing a zoom restriction.
2. Add to cart: check the reported unavailable behaviour. User clarified that starter shop products currently have no stock; make each existing starter SHOP inventory product available with stock quantity 1 when implementation is authorized. Preserve admin-created/edited stock and existing orders. This does not authorize turning the 83 CSV comparison references into saleable inventory.
3. Category navigation: on catalogue pages reached via homepage Explore category, provide clear switching between New phones, Used phones and Accessories. Replace the current Show all products/categories route as the primary switching control; show each chosen category separately.
4. Shop navigation: expose New phones, Used phones and Accessories as distinct choices rather than sending users directly to a combined all-products page. Cover the Shop menu and mobile Shop bottom navigation entry.
5. Mobile bottom dock: remove Cart and WhatsApp; add Favourites. Intended remaining items: Home, Shop, Favourites, Account.
6. Mobile floating actions: place WhatsApp at the right edge with a cart icon directly above it, accessible while shopping. Hide these floating actions on login/account authentication and cart pages; avoid obstructing page content or the bottom dock. Confirm exact account-page handling from context when implementing.
7. Recheck the changed mobile flows, compare viewport behaviour, category switching, cart quantities and both themes before publishing. Desktop should retain its existing design unless a shared functional fix is needed.

Status: queue saved only; no implementation, stock changes, commit, push or deployment performed for this request.

## Mobile shopping update — implemented 13 October 2026

This supersedes the queued-only status above. Owner authorized implementation, including removing the homepage Explore/Favourites row.

- [x] Homepage now opens directly on the slider below the header; compact footer is below the initial phone viewport.
- [x] Category switch links on catalogue pages; dedicated /shop chooser with New phones, Used phones and Accessories. Bottom Shop opens the chooser rather than all products.
- [x] Four-item mobile dock: Home, Shop, Favourites, Account. Cart and WhatsApp moved to a right-side stack, cart above WhatsApp, hidden on login/account/cart/checkout/order pages and while either dialog is open.
- [x] Comparison table now fits all three columns within phone width. Comparison-only fixed-zoom viewport request restores on leaving. Browser accessibility overrides, notably iPhone Safari, can still allow zoom.
- [x] One-time opening quantity of 1 for untouched starter shop products, excluding references, owner-edited/custom inventory and any product already used in an order. Revision and stock versions prevent refill after sales or repeated deployment. Local and Neon migration paths included.
- [x] Build and 816-message translation checks pass; backend regression 36/36 pass. Browser checks at 320/390/430/1440 cover category switching, dock, actions, cart, both comparison columns and both themes. Broader email-login/profile, EMI/admin edits, favourites, checkout/tracking and 320/390/768/1024/1440 checks pass with mock email delivery.
- [x] Fixed a QA timing issue by waiting for favourites to finish loading after reload before counting cards.
- [ ] Commit/push/deploy when requested. No production stock changes or live emails during these checks; the opening stock migration runs after deploying the update.

## New phone issue queue — account improvements

Collect reports only; wait for the user to say start before implementing this batch.

1. Optional customer profile photo: allow customers to upload/change/remove a photo from their account/profile screen after login; show it in the account avatar. Do not require a photo to log in. Validate actual image type/size and protect uploads with customer authentication.
2. Investigate customer login not persisting between visits on the phone. Check session cookie lifetime, secure/same-site settings, session restoration and browser behaviour before changing authentication.
3. Requested email + password sign-in alongside existing email verification. Design verified-email password setup/reset, hashed password storage, rate limits and a Remember me session option. Preserve existing accounts/orders and email-code recovery.
4. User asks to remember passwords locally: use browser/password-manager autofill via appropriate autocomplete fields. Never store raw passwords in localStorage, cookies or application files; persist login with a secure HttpOnly session cookie instead.

Status: saved only. No profile uploads, credential/session changes or implementation performed for this new queue.

## Customer accounts and search visibility — implemented 13 October 2026

Owner authorized the account queue and search cleanup.

- [x] Optional private profile photo upload/change/remove, browser resizing and avatar display; authenticated backend format/size/quantity checks and old image deletion in local/Neon storage.
- [x] Email/password login in addition to email codes, scrypt password hashes, generic failures and identity/IP/global attempt limits.
- [x] Password setup/reset requires an email-code session verified within ten minutes; reset rotates the current token, revokes other sessions and preserves the chosen session duration.
- [x] Remember me uses persistent HttpOnly/SameSite=Lax cookies and server-side hashed tokens for 30 days (one day unchecked). HTTPS automatically applies Secure. Existing sessions keep their original expiry until the next sign-in.
- [x] Browser password-manager autocomplete supported; application storage saves only the remembered email, never a password/token.
- [x] Search header hidden on Favourites, Help, Repair and other non-shopping/account screens.
- [x] Build, translation coverage and 40 backend tests pass. Phone browser checks pass code/password login, password reset, photo upload/reload/removal, restored browser sessions, search visibility and both themes; mock email only.
- [ ] Publish when requested. No new environment variables, live emails, production account/password/photo changes, commit or push performed for this batch.

See docs/customer-account-access.md for session/recovery and photo behaviour.

## Reference profile design and final flow review — 13 October 2026

Owner resumed work and authorized pushing the tested update to main.

- [x] Reference-inspired compact account menu with welcome avatar, icon rows for profile/password/orders/favourites/help and WhatsApp support. Existing brand colours and both themes retained.
- [x] Separate profile editor with round photo/camera control, simple rounded fields and save/back actions. No forced profile editing immediately after login or when opening the account menu.
- [x] Accessible native password sheet with backdrop, Escape/back/outside close and URL-backed recovery. No fake push-notification setting added.
- [x] Login respects the intended destination; embedded sign-in closes its window. Signed-in visitors see an account overview, not editable fields. Checkout explicitly links to profile completion when required.
- [x] Prevent blank password submission, lock fields/method changes during requests and show expired-code recovery.
- [x] Final build, 833 translation checks and 40 backend tests pass. Phone account/photo/password/recovery/persistence tests pass; category/dock/cart/comparison tests pass at 320/390/430/1440 in both themes. Broad admin/EMI/favourites/email-code/profile/checkout/tracking and responsive checks pass at 320/390/768/1024/1440. Email delivery simulated; no production accounts or stock were changed during QA.
- [x] Private environment files and QA images remain ignored. All changes reviewed for the requested commit/push. New production stock migration runs after deployment, not during these local tests.

## Owner task status and standing reminder — 13 October 2026

- Owner confirms latest deployment and real Gmail login-code delivery passed.
- Owner plans actual inventory/prices/photos and EMI setup tomorrow.
- Warranty and final policies belong to the shop owner.
- Location/social links and backups remain for discussion.
- Payment/eSewa removed from the current plan at the owner's request.
- Standing preference: every time the owner asks for the task list, include maintaining/expanding the phone comparison catalogue (new models, corrected specs, source dates and updated CSV). This is a task-list reminder, not a scheduled automation or authorization to fetch/import new data automatically.

## New planning queue — 13 October 2026

Status: collecting requirements only. Do not implement until the owner says to start.

1. Admin bill printing: add a dedicated Billing menu where the owner can prepare and print bills for both website orders and walk-in shop customers. Select items from the existing admin inventory, with inventory changes made through the existing inventory menus reflected in Billing. Website orders should be selectable so their customer/items can prefill a bill; walk-in bills should support entering customer details and selecting items directly. Use a compact receipt layout sized for a typical narrow shop receipt printer, with a PDF version. Visual reference provided in `codex-clipboard-f323761a-716c-4ca5-81fa-085ec094561f.png`: centered shop header, bill number/date, item/rate/quantity/amount rows, subtotal, prominent total, and short thank-you line. Treat the example's shop identity and tax rates as visual placeholders only. Customers who order through the website must be able to access/download their own bill as a PDF after it is issued. Tax/VAT rules are not ready: use clearly provisional, configurable sample settings during development and do not present a sample tax amount as a finalized tax invoice. Confirm final tax/VAT rules, numbering, receipt-printer width, and whether issuing a bill changes stock or order status before real-world use.
2. Homepage slider: add a fourth Repair slide to the existing three category slides. Focus the copy and visual on bike/vehicle digital meter repair; use a web-sourced Pulsar 200 meter/dashboard image as the visual reference, subject to image reuse permission or a suitable licensed alternative. Link the slide to the Repair page. Set automatic rotation to about five seconds per slide so the message can be read; keep swipe navigation and pause rotation during user interaction. Keep the existing desktop/mobile slider behaviour and English/Nepali plus light/dark support.
3. Used-phone condition reports: for each actual used unit, let admin record battery health, screen, cameras, charging, defects, included accessories and other inspected details. Show the report on that unit's product page before ordering. Do not imply an uninspected field passed; distinguish unknown/not checked from passed. Prioritize this item among the new operational improvements.
4. Repair tickets: record each customer device and reported problem with a ticket number, then track received, inspecting, awaiting approval, repairing and ready stages. Provide a simple customer status view and staff update workflow; plan privacy/access before implementation.
5. Order pickup handover: have staff verify the customer's order reference at collection and record the handover time and staff member before marking a website order completed.
6. Inventory freshness: show admins when a product's price and stock were last reviewed, and highlight stale listings for rechecking, especially one-off used phones. Define the review interval with the owner before implementation.

### Proposed low-rework implementation flow (planning only)

1. Lock the data rules in one short pass: receipt fields and numbering; online order versus walk-in stock movement; when bills are issued; used-phone inspection fields; repair-ticket visibility; review interval. Use a provisional non-tax receipt until actual tax rules are supplied. A bill must snapshot item names/prices at issue time so later inventory edits do not rewrite old bills. This is design work, not a request to change production data.
2. Build shared admin/inventory foundations once: add per-listing inspection and last-reviewed metadata to existing product records, and reusable admin form/display helpers. Ship used-phone condition reports and inventory freshness together because they touch the same inventory editor and product listing. Keep unchecked condition fields visibly unknown.
3. Add pickup handover to the existing order detail/status flow. Require a verification step and record staff plus time. Existing order stock reservation must not be deducted again at handover or billing.
4. Add Billing to admin using existing product and order data. Create immutable issued-bill records in the current store, small receipt print CSS/PDF, customer-owned online bill download, and walk-in bill entry. Make walk-in stock deduction atomic and one-time if the owner confirms billing should deduct it. Test duplicate clicks/retries, price edits after issue, and customer access boundaries.
5. Add repair tickets as a separate admin workflow and minimal customer tracking screen. Keep repair tickets separate from product orders and restrict personal details to the customer/staff who need them.
6. Add the fourth Repair hero slide, five-second rotation, translated copy and a reusable/licensed Pulsar 200 meter visual. Validate mobile/full-screen slider and both themes.
7. Run focused tests for each touched flow, then one end-to-end phone/desktop pass (inventory -> order -> pickup -> bill PDF, plus repair status and slider). Commit/push/deploy as one reviewed update when the owner authorizes implementation and publishing.

Implemented locally: Billing with narrow PDF receipts and customer download, used-phone inspection reports, repair tickets and customer tracking, verified pickup handover, inventory review reminders, and the fourth meter-repair slider. Final tax/VAT rules and receipt numbering remain pending the shop owner's confirmation before these receipts are used as tax invoices. Comparison catalogue maintenance remains the standing task-list reminder above.

## New bug reports — 14 October 2026

Implemented locally on 14 October 2026 after the owner asked to fix this batch. Build, translation check, 44 backend tests, and focused phone-browser checks passed. Publish/deployment verification remains.

1. Checkout feels slow when opening it, and the page shows “continuing to shop.” Reproduce the exact navigation and loading state, find why that message appears, then fix the checkout transition.
2. In dark mode on the cart page, the quantity increase (+) and decrease (−) controls are hard to see because a white background covers or washes them out. Fix their contrast and visibility without changing the light theme unnecessarily.
3. Remove all starter/demo products supplied with the website so the shop owner can add the real inventory. Preserve any products the owner has already created, along with existing orders and bills; make the empty shop and admin inventory states clear. Do this when the owner says to start fixing this batch.
4. Mobile Compare page still overflows horizontally, leaving a large white strip to the right of the dark page and cutting off the comparison layout. Reproduce at phone width and fix the page-level width/overflow while keeping the specifications table swipeable inside its own container. Screenshot: `Photo 1.jpg` supplied on 14 October 2026.
5. On phones, the header product search is still visible on Compare, Help and Repair. Hide it on these non-shopping pages at mobile widths, matching the intended page-specific search behavior.
6. Add suitable photos to both the phone-repair and bike/vehicle digital-meter-repair sections of the Repair page. Keep the existing layout readable on phones, and use images the shop can legally display (including the original meter visual already created for the homepage where suitable).
7. On phones, successful customer login still opens the profile editor directly. Match desktop behavior: land on the account overview/settings screen, and open profile editing only when the customer chooses Edit profile. Preserve any intended checkout return path.
8. On both phone and desktop, the language selector/text on the new login screen is overlapped or clipped and does not display properly. Reposition it and verify English/Nepali labels at both viewport sizes.
9. Phone page loads show a dark “Opening the shop… / Loading the current catalogue” block above a large white blank area. The current ProductProvider replaces the entire app until `/api/products` finishes, and its short loading container leaves the root HTML's white background visible below in dark mode. Measure the API response time (including cold starts), avoid blocking unrelated pages on the catalogue, and make any remaining loading state fill and match the theme without a white gap. Screenshot: `Photo 1.jpg` supplied on 14 October 2026.
