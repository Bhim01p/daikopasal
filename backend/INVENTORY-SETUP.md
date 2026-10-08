# Replace the sample catalogue

Real product details are required. Do not relabel sample prices or quantities as actual shop inventory.

In admin → Products, open **Replace sample listings**. Download the inventory template, fill only the entries you need, remove unused entries, and choose the JSON file. The server validates it and shows a preview before the import button becomes available. A blank template cannot be imported.

Each entry needs:

- `name`, `brand`, and `category` (`new`, `used`, or `accessory`).
- `price`: whole NPR amount; `stockQuantity`: whole units available for **new** orders, excluding existing reservations.
- New phones: `ram` and `storage` in GB.
- Used phones: `storage`, a verified `condition` (`Like New`, `Excellent`, `Good`, or `Fair`), and `battery` health percentage. RAM is optional.
- Accessories: one of the existing `accessoryCategory` options; `Other Accessories` is valid when appropriate.
- Optional `description`, `specs` (an object of text values), `image` (existing local asset/upload path), and `color` (hex colour).

Without a supplied image, phones/accessories use labelled illustrative placeholders. Upload actual photos through the regular product editor afterward. Do not paste arbitrary image URLs into the import file. Warranty details must come from the shop; the import does not invent them.

Review every name, price and quantity. **Import real listings and remove samples** removes sample listings and adds the validated products. Existing real listings keep their IDs, quantities and images. All customer accounts, order receipts and notification queues remain intact. Receipts preserve original product snapshots. A removed sample's later cancellation does not recreate that sample listing.

Use a different name for each storage/colour variant. Duplicate existing brand/name/category combinations are rejected; edit an existing real product in the editor instead. Each file supports 1–50 products and must be below 60 KB. Imports fail if the catalogue changes after the preview; choose the file again to review current counts.

The backend saves a private full-store snapshot under `backend/data/catalogue-backups/` before each successful replacement. These files include customer/order data and must remain private. To restore one, stop the backend and copy the chosen backup over `backend/data/store.json`, keeping a backup of the current store first. Restore promptly: a full snapshot also rolls back orders and account changes made after it was created. Keep the images folder, since photos are not removed by imports.

The actual shop catalogue has not been replaced yet because verified inventory was not supplied. Automated import tests use separate QA stores and synthetic fixtures.
