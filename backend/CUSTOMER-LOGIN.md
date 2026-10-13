# Email-code customer login

SMS is no longer used by the deployed website. Customer login uses an email verification code sent through the same backend email transport as order notifications. Guest checkout remains available.

## Configuration

Keep Gmail credentials in the ignored backend/.env for local development and in Vercel server environment settings for hosted use. Existing Gmail app passwords remain valid. Set:

```dotenv
EMAIL_PROVIDER=gmail
CUSTOMER_AUTH_MODE=email
SMS_PROVIDER=disabled
```

The existing GMAIL_USER, GMAIL_APP_PASSWORD and EMAIL_FROM settings are required. Do not put credentials in frontend/VITE variables. Restart the local backend after changing settings. For Vercel, change CUSTOMER_AUTH_MODE to email for Production (and Preview if used), then redeploy. A missing email transport keeps login disabled. Local private configuration was prepared from the already saved Gmail settings; no live login email was sent during implementation.

## Customer flow

1. Enter an email address, receive a six-digit code, and verify it.
2. Complete name and Nepal phone number once. The phone number is contact information, not SMS-verified identity.
3. Saved details fill account checkout and My orders shows orders belonging to that account.
4. To use a different login email, sign out and verify the other inbox. Profile editing cannot change a verified login email.

An existing phone-based account is reused only when its stored email uniquely matches the verified inbox. Its customer ID and account order ownership remain unchanged. Duplicate legacy accounts sharing one email require manual shop assistance; there is no automatic merge. Accounts without an email need shop assistance. Guest receipts remain available using their original browser receipt tokens; guest orders are not silently claimed by a matching phone number or email.

## Limits and security

- Five-minute expiry, single-use codes, hashed challenges, maximum five wrong attempts.
- One-minute resend cooldown, five requests per identity/hour, ten per IP/hour, and a shared cap of 200 email login requests per day. The cap reserves some Gmail capacity for order emails; it is not a guarantee of provider delivery.
- Seven-day HttpOnly sessions, stored as token hashes. Hosted challenges and request limits use shared database state; local challenges reset when the backend restarts.
- No automatic retry of login emails, no codes in production API responses, UI or logs, and generic sender errors.
- Development-code and old SMS paths remain only for isolated regression compatibility. The application does not create an SMS sender, and public hosting rejects development mode.

## Verification

Backend tests cover delivery failure, expired/reused/incorrect codes, verified-email locking, duplicate legacy emails, account preservation and profile completion. Browser checks use a mock mail transport and isolated QA data. Verify one real inbox login after deployment; mock acceptance does not establish Gmail inbox delivery.
