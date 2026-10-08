# Customer order emails

Checkout collects a required customer email address. A new order and its **Order received** email are saved together. Each actual order status change queues a separate update. Saving the same status again or retrying checkout does not produce duplicate messages. Old orders without email addresses remain usable, but cannot receive email updates.

The initial email acknowledges receipt and says the shop still needs to confirm stock, prices and pickup timing. Later messages cover Confirmed, Ready for pickup, Completed and Cancelled. Emails include the reference, items, total, status, pickup location/hours and shop phone. Sample listings are marked. No online payment or delivery is implied.

## Current mode

Sending is **disabled until configured**. Queued email content is stored in the ignored `backend/data/store.json`; no email is sent externally. Admin → Orders shows the customer's email and notification states. Review queued orders before enabling live sending, since queued messages resume when configuration is activated.

## Connect a sender later

The prepared adapter uses [Resend's email API](https://resend.com/docs/api-reference/emails/send-email), without adding a package dependency.

1. Create a Resend account and verify a domain you own. Resend requires [domain verification](https://resend.com/docs/dashboard/domains/introduction) for your production sender; an arbitrary Gmail address is not a verified Resend sending domain.
2. Create an API key for sending. Keep it in the ignored `backend/.env`, never in frontend code or a public file.
3. Add these fields to the existing `.env`, preserving its admin configuration:

   ```dotenv
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=your_private_key
   EMAIL_FROM=Machhapuchhree Electronics <orders@your-domain.example>
   EMAIL_REPLY_TO=your-shop-contact@example.com
   ```

   `EMAIL_REPLY_TO` is optional and may be a shop inbox such as Gmail. Do not use the example addresses for live sending.

4. Restart the backend. Pending emails are processed when it starts and every 15 seconds while it runs. Keep the backend online for automatic updates and retries.
5. Place an order using an email address you control, confirm receipt, then change its status in admin and check the second email. Check your spam folder as well. Isolated automated tests use mocked sending; they do not demonstrate real inbox delivery.

## Delivery behavior

- Order and status changes succeed even when the email provider is unavailable. The persistent queue survives restarts.
- Transient failures retry after 1 minute, 5 minutes, 15 minutes and 1 hour (five attempts total). Permanent provider rejections and exhausted retries show **Needs attention** in admin. **Retry email** retries the same notification when safe.
- Stable content and a provider idempotency key prevent duplicates during retries. [Resend retains keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); retries pause after 23 hours from the first attempt. Older uncertain sends need review in the provider before resending.
- **Accepted by email service** means the provider accepted the request. It does not prove inbox delivery. Bounce/delivery webhooks are a future improvement; delivery failures after acceptance must currently be checked in the provider dashboard.
- The queue sends events for each order in sequence while earlier events are waiting for retry. Customers may receive several updates if admin changes an order several times.
- Guest order submissions are limited per sender IP and recipient email to reduce notification abuse. Customer login and verified email profiles can be added separately.
- Email content and customer details are private data. Back up and restrict access to the full `backend/data/` directory. Only the authenticated admin API exposes notification summaries.

Orders remain shop pickup only, with payment arranged at pickup. Customer login is available separately; live SMS activation and online payment setup are still pending.
