# Smartphone verification report — completed pass

User-provided report, saved as supplied. Its verification and validation claims have not been independently checked against sources or a CSV by this project.

Verified at: 2026-10-13
Primary source: GadgetByte Nepal.
Method: Only configurations explicitly supported by the cited Nepal-facing source were added. Unknown fields remain blank.

## Models excluded or deferred because the requested exact model could not be safely verified from GadgetByte Nepal

- Samsung Galaxy A07 5G
- Apple iPhone 14 Pro Max
- Xiaomi 17 Ultra
- Xiaomi 17T
- Redmi Note 17 Pro Max 5G
- Redmi Note 17 Pro
- Redmi Note 15 Pro Plus
- POCO X8 Pro Max
- POCO M8s
- Realme C71
- Realme Note 70
- Infinix Note 60 Pro
- OPPO A6x 4G
- OPPO A6c
- OPPO A6X
- Honor X5d
- Google Pixel 9 Pro

These names were not force-matched to similar devices. This prevents mixing regional variants or similarly named models.

## Important source conflicts / cautions

- Galaxy A07 5G: GadgetByte search material conflicts with 4G/Helio G99 data, so no row was created.
- iPhone 13: the current price article displays iOS 26, which is a current OS, not launch OS. Launch OS was taken from GadgetByte’s original iPhone 13 review (iOS 15).
- iPhone 11: current GadgetByte product copy contains an obvious “iPhone 13” typo in the display paragraph. Only consistent specification fields were used.
- Redmi Note 17 4G: GadgetByte’s Nepal article and product page disagree on displayed current price, but specifications/configurations agree; prices are excluded from this database anyway.
- Infinix Note Edge: GadgetByte article and product page disagree on some RAM availability and display wording. Nepal configurations explicitly shown by the Nepal article were retained; fields were kept conservative.
- Honor X6c: the article’s prose says 8/256 in its generic specification list, while its Nepal availability table lists 6/128 and 6/256. Nepal rows follow the explicit Nepal table.
- Honor Play 10: GadgetByte product-page summary contains display/IP wording inconsistent with its detailed specification table/current article. Detailed/current fields were preferred.
- Moto G06 Power: GadgetByte uses “G81 Extreme” in one article and “G81 Ultra” in its product database. The CSV uses the product-database chipset name and flags this conflict here.
- Zero in wireless_charging_w is used only where GadgetByte explicitly states “Wireless Charging: No”; otherwise unknown wireless charging is blank.

## Validation

- Header schema unchanged.
- IDs are unique.
- Every included row has at least one supporting source URL.
- Numeric columns parse as numbers where populated.
- CSV was re-read with Python’s RFC-compatible CSV parser and every row has the same column count.
- UTF-8 encoding used.
