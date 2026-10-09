# Customer and admin experience review — 9 October 2026

Status: The user approved this work and the customer/admin usability changes are implemented on 9 October 2026. The original source review below is retained to explain the decisions. Gmail, deployment and live SMS activation retain their separate pending status.

Implemented: saved English/Nepali choices for storefront and admin; translated interface/error/accessibility text and Devanagari typography; Nepali phone/OTP digit normalization; optional Nepali product descriptions with English fallback; order notification language and bilingual queued email content. Language changes preserve active forms, filters, cart and product drafts.

Customer updates: one mobile catalogue search, compact category heading, clearer cart/pickup/payment wording, separate change-number/resend controls with countdown, focused form errors, clearer product hierarchy, automatic receipt refresh and directions beside pickup details.

Admin updates: explicit confirmation/readiness actions, a review dialog before completion/cancellation, order search and status/date filters, grouped product fields and structured specifications, sticky Save/Cancel, unsaved-edit protection, quick stock updates with stale-version checks, and service/failed-notification summaries.

Validation: production build, 20 isolated backend tests, translation coverage, complete customer/admin order lifecycle and responsive browser checks. Real inventory/photos, live SMS/email delivery and hosted database/deployment verification remain separate pending tasks. English descriptions remain the fallback when an owner has not entered Nepali content.

## First priority: Nepali and English

The interface currently hardcodes English strings throughout the React pages, backend validation and messages. The HTML language is fixed to English. Add a shared translation system and a compact `English / नेपाली` selector for the customer website and admin, remembering the choice without losing cart, form input, login state or current filters. Use English as the initial default unless the owner chooses otherwise.

Translate navigation, page text, accessibility labels, filters, stock/condition labels, login, checkout, receipts, order progress, Help, Repair, admin forms, confirmations and validation errors. Keep stable internal status/category values; translate their display labels. Product brands and model names remain as supplied. Add optional English and Nepali descriptions with an English fallback for missing content. Save the customer's chosen notification language with an order before adding bilingual email content.

Use a Devanagari font, suitable text size/line height and `html lang="ne"` or `lang="en"`. Normalize Nepali digits to ASCII for phone/OTP validation; the current `\D` code filter discards Nepali digits. Allow Nepali names and notes. Test both languages at all supported widths, including longer translated labels and keyboard/screen-reader text. Do not rely on browser auto-translation.

Primary references: [React i18next](https://react.i18next.com/), [Noto Sans Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari), [W3C page language guidance](https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html).

## Customer improvements

1. **One search field on mobile catalogue pages.** Layout currently renders global header search while Catalogue renders its own field. Use the category field as the main mobile search while retaining access to searching all categories. Keep desktop controls compact.
2. **Small visible category heading.** Catalogue currently has only an `sr-only` heading. Add a compact “New phones · 10 products” heading so a mobile visitor knows which category is open, without restoring photo banners or large introductory sections.
3. **Clearer buying language.** Checkout currently says “Payment confirmed with the shop” and Product offers “Buy now,” although payment is arranged later. Prefer “Pay at pickup” and “Order for pickup.” Show an unambiguous review of details and total before submitting. Use “Cart” consistently if the owner prefers conventional shopping labels to “Bag.”
4. **OTP recovery and forms.** Split “Change number / request new code” into separate controls, display the resend countdown, move focus to the first invalid field and give translated corrective messages. Preserve input when changing language or recovering from a connection issue.
5. **Readable product cards and real imagery.** Keep photo, name and price prominent; move secondary details below them. Use consistent photo backgrounds/crops and concise used-phone condition/battery labels. Real inventory photos will address the repeated placeholder imagery. Keep the white/charcoal/pink theme with consistent spacing and readable muted text.
6. **Clear order progress and pickup.** The receipt and My orders already have status history. Improve their visual hierarchy and next-action guidance, add directions beside pickup information, and show a last-refreshed time. Preserve the existing distinction between guest receipts and signed-in orders; never make private orders publicly searchable by number/reference alone.

## Admin improvements

7. **Intentional order actions.** Admin's status select currently saves immediately. Show explicit actions such as Confirm order, Ready for pickup and Complete pickup. Ask the operator to review cancellation/completion before closing an order, and clearly show the resulting customer notification and stock effect. Closed orders are already enforced by the backend.
8. **Find orders quickly.** Add order search by reference/customer name/phone plus status/date filters. Retain current pending/ready/stock overview cards, with clearer separation of new orders awaiting action from already-confirmed orders.
9. **Shorter product editing.** Group existing fields into Photos, Basic details, Price & stock and Specifications. Use structured specification fields instead of requiring `Name: Value` lines for common details. Add a sticky Save/Cancel bar on phones and warn before discarding unsaved edits.
10. **Quick stock editing.** Let the owner update quantity from the product list while retaining current stale-edit protection and order reservations. Keep full product editing available for other changes.
11. **Attention and service status.** Highlight failed notification jobs and whether SMS/email are connected in a compact admin area. Existing per-order notification state and retry controls remain useful; provider acceptance must continue to be distinguished from inbox/handset delivery.

Recommended sequence: bilingual foundation and customer labels/forms; safer admin order actions and order search; product editing and quick stock; then visual refinements and notification summaries.

The review above was originally based on source. Subsequent implementation was verified in an isolated local browser preview, including both languages at 320–1920px. This does not replace a physical-device or live hosted-service test. No real orders or credentials were changed.
