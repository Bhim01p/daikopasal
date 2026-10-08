# Connect real phone verification

An optional Sparrow SMS adapter is implemented in `sms.mjs` and wired into the backend. It follows the provider's [outgoing SMS API](https://docs.sparrowsms.com/sms/outgoing_sendsms/). Its HTTPS endpoint was reachable without credentials. Automated checks use mock responses; actual handset delivery has not been verified.

The current local workspace still uses development codes. Real SMS is **not active**. If the shop already uses another provider, adapt `createSmsTransport` to that provider before enabling it; do not enter another service's token in the Sparrow fields.

## Account setup

1. Obtain a Sparrow SMS account, the sender identity assigned to that account, its API token, and sufficient SMS credits. Confirm OTP sending and supported Nepal networks with the provider. No account, purchase or sender registration has been made by this project.
2. Add these settings privately to the existing ignored `backend/.env`, preserving admin and email settings:

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

The current JSON store and in-memory OTP/rate-limit state support one backend process. With a reverse proxy, limits currently see its socket address; configure trusted forwarding and verify limits per customer IP as part of the chosen hosting setup. Do not blindly trust public `X-Forwarded-For` headers. Running multiple instances requires shared sessions, challenges, rate limits and inventory storage.

Provider acceptance only means queued for delivery. A real handset test is required to confirm delivery. Email notifications are configured independently in [EMAIL-SETUP.md](EMAIL-SETUP.md).
