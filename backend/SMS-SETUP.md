> Superseded on 13 October 2026: SMS was removed from the deployed website at the owner's request. Do not activate this historical checklist. See CUSTOMER-LOGIN.md for email-code login.

# Connect real phone verification

An optional Sparrow SMS adapter is implemented in `sms.mjs` and wired into the backend. It follows the provider's [outgoing SMS API](https://docs.sparrowsms.com/sms/outgoing_sendsms/). Its HTTPS endpoint was reachable without credentials. Automated checks use mock responses; actual handset delivery has not been verified.

The current local workspace still uses development codes. Real SMS is **not active**. If the shop already uses another provider, adapt `createSmsTransport` to that provider before enabling it; do not enter another service's token in the Sparrow fields.

## Account setup

1. Obtain a Sparrow SMS account, the sender identity assigned to that account, its API token, and sufficient SMS credits. Confirm OTP sending and supported Nepal networks with the provider. No account, purchase or sender registration has been made by this project.
2. Add these settings privately to the existing ignored `backend/.env`, preserving admin and email settings:

   The interactive shortcut is `npm.cmd run sms:setup`. It asks for the assigned sender and hides the API token while you enter it. It preserves existing admin/email configuration and sends no SMS. `npm.cmd run sms:check` checks whether all required settings are present without sending or purchasing messages. These checks do not verify account approval, credits or handset delivery.

   ```dotenv
   CUSTOMER_AUTH_MODE=sms
   SMS_PROVIDER=sparrow
   SPARROW_SMS_TOKEN=your_private_token
   SPARROW_SMS_SENDER=your_provider_sender_identity
   ```

   Never put the token in frontend code, screenshots, chat, or a committed file. Incomplete configuration keeps login disabled; it does not expose a test code as a fallback.

3. Restart the backend. Open `/login`: the button should say **Send login code**, and the development-code box must be absent.
4. Use a phone you control. Request a code, verify receipt, enter it, complete the name/email profile, place a test pickup order, and check My orders. Repeat delivery testing on the networks the shop expects to support.
5. Check wrong/expired codes and an unavailable provider. Codes expire after five minutes; failed sends return a generic error with no token or OTP exposed. The adapter does not automatically retry ambiguous sends that might already have been accepted and billed.

## Before a public launch

Use HTTPS and `COOKIE_SECURE=true`, set `NODE_ENV=production`, and remove demonstration accounts/orders from production data if any were created. Development sessions cannot access SMS-mode accounts. Localhost preview URLs are not a deployment.

The local JSON store and in-memory OTP/rate-limit state support one backend process. The prepared database adapter shares challenges, attempts and sessions across hosted instances; two-instance verification tests pass with a simulated transactional store. Live Neon/Vercel testing and deployment remain paused and incomplete. Only the Vercel entrypoint uses its trusted ingress IP; the normal Node server continues to use the socket address. Do not blindly trust public `X-Forwarded-For` headers.

Provider acceptance only means queued for delivery. A real handset test is required to confirm delivery. Email notifications are configured independently in [EMAIL-SETUP.md](EMAIL-SETUP.md).
