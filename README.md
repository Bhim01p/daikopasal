# Machhapuchhree Electronics

Machhapuchhree Electronics is a bilingual (English/Nepali) electronics storefront and private shop-management system. It uses a React, TypeScript, and Vite frontend with a Node.js backend. The app supports light and dark themes, responsive layouts, Vercel deployment, and Neon-backed hosted storage.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

The combined development command starts the frontend and backend:

- Storefront: `http://127.0.0.1:8767/`
- Admin: `http://127.0.0.1:8767/not-admin`
- Backend/API: `http://127.0.0.1:3001/`

Stop an existing development server before starting another. If PowerShell blocks `npm.ps1`, use `npm.cmd`.

To run the frontend and backend separately, use `npm run dev:frontend` and `npm run dev:backend` in separate terminals. After building, `npm start` serves the compiled frontend and API from the backend.

Initialize or change a local admin login only when needed with `npm run admin:setup`. Keep local environment files, admin access files, database files, uploads, and credentials out of Git.

## Storefront

Customers can browse and compare products, search and filter the catalogue, view product specifications and image galleries, save favourites, and use the cart and checkout. New phones, used phones, and accessories are separate product categories.

Checkout supports shop pickup or home delivery. Pickup can use Pay at Shop or manual QR payment; delivery requires QR payment. QR submissions remain pending until verified by an admin. Order totals and stock reservations are calculated by the backend. Customers can view private order receipts and status updates.

The Help page provides shop contact and location information. The Repair page accepts mobile-phone and digital-meter repair requests and supports secure repair tracking.

The storefront supports English and Nepali. Nepali interface text uses the Noto Sans Devanagari font; English keeps its existing typography. The language preference is stored separately for customer and admin areas.

## Products and phone catalogue

A store product is created intentionally by an admin. The phone master catalogue is reference data used to fill product specifications; its devices and variants are not automatically added as store inventory. RAM/storage variants of one catalogue device can share the same device identity and generic image gallery while each store listing keeps its own price and stock.

Used-phone listings support condition, battery and inspection information, customer-visible changes or defects, and actual device photos. Real product photos take priority over generic catalogue images, and generic catalogue images take priority over the placeholder.

Catalogue image records and source/licensing metadata are kept in `data/phone_images.csv`. A device can have up to three catalogue images. Catalogue images are reused across variants; they do not replace genuine used-phone photos. Product Detail can display attribution for catalogue images that require it.

Reference phone specifications are in `data/phone-reference/phones_master_catalogue_v3_nepal_expanded.csv`; bilingual model descriptions are in `data/phone_descriptions.json`. Keep these reference files separate from store inventory and preserve licensing/attribution metadata when image records are updated.

## Admin

The authenticated `/not-admin` workspace manages products, inventory, orders, payment verification, billing, staff access, and phone catalogue reference data. Product changes are reviewed before saving. Admin access and APIs are enforced by the backend; staff permissions are limited by their assigned role.

The Billing page supports in-store sales and receipts. Orders, billing, payment verification, product stock, and customer information use the existing backend services; do not edit production database files directly.

## Project layout

- `frontend/src/` — storefront, admin screens, shared components, and styles
- `backend/` — API, authentication, validation, database and local-store adapters
- `shared/` — shared translations and locale helpers
- `data/` — phone reference catalogue, descriptions, and catalogue-image manifest
- `scripts/` — development, import, verification, and deployment utilities
- `vercel.json` — Vercel build and serverless function configuration

## Checks

```sh
npm run build
npm run test:backend
node scripts/check-translations.cjs
```

The production build runs the frontend TypeScript check and Vite build. Backend tests use isolated test data. Translation validation checks static interface messages against the Nepali dictionary; product names and owner-entered content remain as supplied.

## Deployment

Vercel deployment uses the repository root and the root `npm run build` command. Hosted data uses the configured Neon connection. Deployment and environment setup notes are in [DEPLOYMENT.md](DEPLOYMENT.md). Never print or commit environment-variable values, credentials, local data, or private uploads.