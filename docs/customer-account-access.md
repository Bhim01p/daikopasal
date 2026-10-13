# Customer accounts: passwords, sessions and photos

Uses the existing email-code transport, customer records and local/Neon image storage. No new environment variables or paid service are required. Existing customer IDs and order ownership remain unchanged.

## Sign-in and recovery

- Email-code sign-in remains available and is the first-time/recovery path.
- After verifying an email code, the customer has ten minutes to set/reset a password in their profile. Passwords must contain 10–128 characters.
- Passwords are stored only as independently salted scrypt hashes. Public customer responses never contain the hash.
- Password sign-in has identity, IP and global attempt limits and a generic failure message.
- Saving a password rotates the current session and revokes all other sessions for that customer. A password-authenticated session alone cannot reset the password: fresh email proof is required.
- Browser password managers are supported through standard username/current-password/new-password fields. Application storage remembers only the email address when requested, never passwords or session tokens.

## Staying signed in

- Remember me: 30-day server session and persistent HttpOnly cookie.
- Without Remember me: one-day server session/cookie.
- Password setup/reset preserves the current session's remaining duration.
- Cookies use SameSite=Lax, Path=/api, and Secure when configured or served behind HTTPS. Tokens are stored as hashes in the existing persistent store.
- Existing sessions retain their prior expiration. Sign in again after deployment to receive the updated duration. Browser/private-mode data clearing can still remove a session.

## Profile photos

- Upload/change/remove is optional in the signed-in profile.
- The browser accepts JPG/PNG/WebP up to 10 MB, crops/resizes to a 512px square JPEG and strips original metadata through canvas re-encoding.
- The server verifies the format, limits uploads to 2 MB and ten successful uploads per customer/day, and uses generated avatar filenames.
- Photo viewing and changes require a valid customer session. Avatar filenames are excluded from public product-photo routes; private responses use no-store caching.
- Replacing/removing a photo deletes the previous stored image, including the Neon image row when hosted.
- Header and bottom account avatars reflect the photo. No shop inventory or order data is changed.

Header product search is now limited to shopping pages. Favourites, Help, Repair and account screens do not show a search bar that redirects away from their task.

Validation: backend password/recovery/photo tests plus phone browser checks using simulated email delivery. This does not establish real Gmail inbox delivery.

## Account navigation and reference design

Account opens a read-only settings menu. Profile editing is explicit at /account?edit=1 and photo changes live with that editor. Password management opens a native modal sheet at /account?security=1. Recovery returns to that sheet after email verification. Login returns to its validated next destination; it does not force new customers into an editor. Checkout offers an explicit completion link if required details are missing. Existing colours and both themes are retained.
