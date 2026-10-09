# Pending project tasks

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
