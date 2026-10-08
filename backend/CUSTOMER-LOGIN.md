# Customer login and My orders

The storefront has `/login`, `/account` and `/my-orders`. A signed-in customer completes their name and email once; checkout uses those saved details directly from the server. Customers can edit their name/email in their profile, while changing the login number requires signing out and logging in with the other number. Guest checkout remains available.

My orders lists only orders placed while signed into that customer account. Guest orders are not claimed based on a matching phone or email. Guest receipts continue using their private browser token. Account receipts require an authenticated owner session and are not saved to browser local storage. Each receipt includes the actual status change history, and My orders refreshes while visible and on window focus.

## Local testing now

The local workspace uses `CUSTOMER_AUTH_MODE=development` in the ignored `backend/.env`. Open `/login`, enter a Nepal mobile number and choose **Get test code**. Enter the code displayed on the page, then save a name and email. Add a product and checkout; the details form is replaced by a saved-profile summary. Open My orders, update that order in admin and refresh to see the change.

These codes are **local demonstrations, not SMS verification**. They do not prove ownership of a phone number. They are only exposed for loopback connections with a localhost host, a loopback backend binding and a non-production environment. Public hosts, production mode and previously SMS-verified accounts cannot use development login.

The QA server explicitly uses local development auth and disables real email sending. Backend SMS-path tests inject a mock transport; they do not send real SMS.

## Live SMS activation still pending

The default mode is `disabled`. The backend now includes an optional Sparrow SMS adapter using the `smsTransport.sendOTP(phone, code)` interface. Enable it with `CUSTOMER_AUTH_MODE=sms`, `SMS_PROVIDER=sparrow`, a private API token and the account's sender identity. No live credentials or provider account are configured. See [SMS-SETUP.md](SMS-SETUP.md) for activation and handset testing. Another provider can replace that adapter if the shop already has an account.

Before publishing, set `NODE_ENV=production`, use HTTPS with `COOKIE_SECURE=true`, disable development auth, connect the provider and test real code delivery on the supported Nepal networks. Do not expose the local demonstration as live phone verification.

## Session and verification behavior

- Phone numbers are normalized to `+977` format; local numbers and `977` prefixes resolve to the same account.
- Codes expire after five minutes, are single-use, and allow at most five wrong attempts. Requests have a one-minute resend cooldown and hourly phone/IP limits. Codes are kept as hashes in memory; a restart invalidates pending codes.
- Customer sessions last seven days and survive backend restarts. Session tokens use HttpOnly cookies; only their hashes are stored. Logging out revokes the current device's session. Admin and customer logins are separate.
- The backend associates new account orders with a customer ID and checks ownership on every order-list and receipt request. It ignores supplied customer contact details for authenticated checkout, using the stored profile instead. An expired account checkout does not silently become a guest order.
- Orders preserve the customer/product/price details used when placed, even if the profile or catalogue changes later.
- Email sending remains a separate pending task: [EMAIL-SETUP.md](EMAIL-SETUP.md).

Customer profiles and session hashes are stored in the ignored `backend/data/store.json`. The JSON store still supports one backend process; hosted storage can be selected when deployment is requested.
