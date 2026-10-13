# Phone comparison CSV data dictionary

Saved from the user's supplied dictionary on 2026-10-13 for future reference catalogue imports. Saving this document does not implement or run an import.

| Field | Format / allowed values |
| --- | --- |
| id | Stable unique lowercase slug: brand-model-region-ram-storage. |
| brand | Manufacturer brand name. |
| model | Exact marketed model name. |
| model_number | Manufacturer/model code when verified; otherwise blank. |
| region | Nepal for Nepal-specific verified rows; `unspecified` when region cannot be established. |
| nepal_availability | `Yes`, `No`, or `unconfirmed`; blank only when no availability statement can be made. |
| release_date | ISO `YYYY-MM-DD`; blank when not safely verified. |
| ram_gb | Numeric GB value only. |
| storage_gb | Numeric GB value only; 1TB=1024, 2TB=2048. |
| display_size_inches | Numeric diagonal inches. For foldables, the primary/inner display is used. |
| display_type | Verified panel technology/name. |
| resolution_pixels | Pixel dimensions as `width x height` when verified; a source-only class such as `QHD+` is retained only when exact pixels were not established. |
| refresh_rate_hz | Numeric maximum refresh rate. |
| chipset | Verified SoC name. |
| gpu | Verified GPU name; blank if not verified. |
| rear_camera_details | Semicolon-separated verified rear-camera modules. |
| front_camera_details | Verified front-camera module(s). |
| battery_mah | Numeric rated/identified capacity in mAh. |
| wired_charging_w | Numeric supported wired charging wattage; blank if source gives only charging time/percentage. |
| wireless_charging_w | Numeric supported wireless charging wattage; blank if unknown. |
| launch_os | OS/software at launch, not assumed current OS. |
| network_support | Verified cellular generations/technologies. |
| sim_details | Verified SIM arrangement. |
| nfc | `Yes` or `No` only when explicitly verified; otherwise blank. |
| headphone_jack | `Yes` or `No` only when explicitly verified; otherwise blank. |
| memory_card_support | `Yes` or `No` only when explicitly verified; otherwise blank. |
| ip_rating | Verified ingress-protection rating such as `IP68`; blank if unknown. |
| weight_g | Numeric grams only. |
| dimensions_mm | Verified dimensions in millimetres; foldables may include folded/unfolded dimensions. |
| source_urls | One or more supporting URLs separated by ` \| `. |
| verified_at | ISO `YYYY-MM-DD` date the row was checked. |

The pasted source_urls cell was truncated. Its separator above is restored from the agreed CSV prompt: space, vertical bar, space.
