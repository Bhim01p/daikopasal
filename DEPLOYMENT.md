# Vercel + Neon deployment

Use one Vercel project for the storefront and backend: `machhapuchhreeelectronics`.
The Git repository currently has the name `Bhim01p/daikopasal`; its root contains this shop's frontend, backend, API and shared translations.

## Build settings

In Vercel → Project → Settings → Build and Deployment:

| Setting          | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Root directory   | Repository root (leave blank; do not choose frontend or backend) |
| Framework preset | Vite                                                             |
| Install command  | `npm ci`                                                         |
| Build command    | `npm run build`                                                  |
| Output directory | `frontend/dist`                                                  |
| Node.js          | 24.x                                                             |

These commands are also declared in `vercel.json`. The root build script runs the frontend workspace's TypeScript and Vite build. Backend functions are bundled from `api/`.

## Commands on the laptop

Open a terminal in `C:\Users\USER\Desktop\macchapurche electonics`.

1. Run `npm run deploy:check`: verifies the private Neon connection and Gmail authentication without sending email. Already passed on 9 October 2026.
2. Run `npm run deploy:configure`: copies only the necessary settings from private files into this project's Production and Preview environment variables. It preserves the local admin username/password hash, generates a private scheduler secret and never prints secret values. This command contacts Vercel; configuration was left for the owner to run.
3. Run `npm run build` and `npm run test:backend`.
4. Run `git status`. Ensure private `.env` files, `backend/deployment.env`, `backend/ADMIN-ACCESS.txt`, `backend/data`, `.vercel`, and `node_modules` are absent from the changes to commit.
5. Run `git add .`, then `git diff --cached --stat` to review the files being committed.
6. Run `git commit -m "Prepare Vercel deployment and bilingual shop improvements"`.
7. Run `git push origin main`. This uploads committed source code and triggers a new Vercel build. Redeploying an old Git commit does not include edits saved only on the laptop.
8. Open the newest Vercel deployment. Check that its commit matches your new commit and its status is Ready. Then verify `/api/health`, products, admin login, photo upload and guest checkout.

If PowerShell blocks npm/npx scripts, use `npm.cmd` / `npx.cmd` instead. Vercel CLI was authenticated and the project linked on 9 October 2026. If needed later, run `npx --yes vercel@63.1.0 login`, then `npx --yes vercel@63.1.0 link --yes --scope dhungananishan928-9022 --project machhapuchhreeelectronics`.

## Prototype limits and launch checks

- Vercel Hobby is for personal, non-commercial use. Use Pro for the commercial shop launch: https://vercel.com/docs/plans/hobby.
- Photos are stored in Neon for this small prototype; hosted photos are limited to 4 MB each. Keep images compressed and monitor database storage.
- Each API invocation can process a bounded email batch after its response. The authenticated cron job supplies a daily fallback at 02:00 UTC (07:45 Nepal time). This fits Hobby's scheduler limits but can delay retries until the next day when the site is idle. For Pro, change the cron schedule to `*/5 * * * *` and redeploy for retries every five minutes.
- For this update, set `CUSTOMER_AUTH_MODE=email` in Vercel Production/Preview and retain the existing Gmail settings. Keep `SMS_PROVIDER=disabled`. Redeploy after the environment change. Never enable development OTPs on Vercel.
- The Neon integration test uses a unique temporary `qa_deployment_...` schema, completes order/photo checks with email sending disabled, then removes only that test schema. Shop data is kept separate.
- Actual recipient inbox delivery, hosted checkout/status updates, photo retrieval after redeploy, and hosted cookie/session behavior must still be verified. Gmail SMTP authentication alone does not prove inbox delivery.
- Never commit secrets or upload the private environment files. `.gitignore` and `.vercelignore` exclude them. The new sourced listings have temporary estimated prices and zero stock: confirm actual prices, unit condition and quantities before selling.

## 13 October update

No new credential names are required. The existing CUSTOMER_AUTH_MODE value must change from disabled to email to enable email-code login. The configure script now selects email mode, but it overwrites other settings from private laptop files; use a targeted Vercel dashboard change when other hosted settings already work. Existing unique-email phone accounts keep their IDs/orders after verification. Duplicate legacy emails require manual assistance.

The one-time starter migration replaces only untouched examples; receipts and owner-edited/uploaded inventory are preserved. Do not reset the Neon database or remove its store row. SQL backup/recovery is still deferred.
