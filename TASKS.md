# Pending project tasks

## New change queue — waiting for the user's start instruction

The store address and Google Maps links are the final authorized task before this queue. Collect subsequent requests here; do not implement them until the user explicitly says to start.

1. Remove the photo banner between the navbar and catalogue search controls on New phones, Used phones, Accessories and other pages using this layout.
2. Make the catalogue search bar smaller and more compact on these pages.
3. Remove the top strip showing “Lekhnath, Pokhara, Nepal · Open 8 AM–6 PM” and the phone number across the website. Keep contact information on Contact & Help.
4. Rename the Contact & Help page and its navigation label to Help. Keep the store contact/location details and general enquiry form there.
5. Add a Repair navigation button and a separate Repair page. Move the Phone repair section (description, inspection note, common repair enquiries and contact actions) and Digital meter repair section (description, inspection note and contact actions) from Help to Repair. Remove these sections from Help after moving them.
6. Allow the owner to set a custom admin username and password privately on the laptop. Current setup generates a random password; implement this later with the queued changes.

Status: Queued only. Do not implement until the user says to start.

Completed: added the supplied address, `43MM+778, Lekhnath, Gandaki Province 33700`, and Google Maps search/directions links using the supplied listing name. A verified place pin/embedded map remains pending.

The user is back home and has asked to resume the saved setup tasks. Real inventory replacement, live SMS activation, email setup and the final live order test can proceed as the required shop information and service accounts become available. Prepared implementation and QA results are saved.

## Replace demo catalogue with shop inventory

Status: Ready for setup — quantity tracking, order reservation, cancellation restocking and a validated import preview with private backups are implemented. Awaiting verified shop inventory.

- [ ] Provide real product names, prices, photos and specifications.
- [ ] Enter quantities available for new orders in admin; existing reservations are already deducted.
- [ ] Replace or remove the sample listings and their demo quantities before publishing.

Guide: [backend/INVENTORY-SETUP.md](backend/INVENTORY-SETUP.md).

## Connect customer order emails

Status: Ready for setup — the user is home; domain/sender/service details are needed next.

The email feature is implemented and tested with mocked sending. Checkout collects an email address; new orders queue an order-received email; actual admin status changes queue updates. Live sending is currently unconfigured. Payment gateway work remains deferred.

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

Status: Ready for setup — customer login, My orders and an optional Sparrow SMS adapter are implemented and tested with mocks. Awaiting provider account/private configuration. Live SMS is not active.

- [ ] Choose a Nepal SMS provider and create its account/sender configuration.
- [x] Implement and wire the optional Sparrow SMS adapter.
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
