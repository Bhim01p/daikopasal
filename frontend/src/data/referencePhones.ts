export interface ReferencePhone {
  id: string;
  brand?: string;
  name: string;
  variant: string;
  sourceUrl: string;
  sourceUrls?: string[];
  checkedAt: string;
  specs: Record<string, string>;
  provenance?: string;
}
// Manually verified facts from the linked manufacturer pages. No live scraping or AI.
export const referencePhones: ReferencePhone[] = [
  {
    id: "reference-redmi-9-np",
    name: "Redmi 9",
    variant: "Nepal / Helio G80 (not Redmi 9 India)",
    sourceUrl: "https://www.mi.com/np/redmi-9/specs",
    checkedAt: "2026-10-13",
    specs: {
      Display: "6.53-inch, 2340 × 1080",
      Processor: "MediaTek Helio G80",
      RAM: "3 / 4 GB",
      Storage: "32 / 64 GB",
      Battery: "5020 mAh (typical)",
      Charging: "18 W supported; 10 W included",
      "Rear camera": "13 + 8 + 5 + 2 MP",
      "Front camera": "8 MP",
      Network: "2G / 3G / 4G",
      Bluetooth: "4.2",
      Weight: "198 g",
      Security: "Rear fingerprint sensor",
      Ports: "USB-C; 3.5 mm audio",
      "Launch software": "Not provided in this source",
    },
  },
  {
    id: "reference-redmi-10-global",
    name: "Redmi 10",
    variant: "Global / Helio G88 (not Redmi 10 India or Redmi 10 5G)",
    sourceUrl: "https://www.mi.com/global/product/redmi-10/specs/",
    checkedAt: "2026-10-13",
    specs: {
      Display: "6.5-inch, 2400 × 1080; up to 90 Hz",
      Processor: "MediaTek Helio G88",
      RAM: "4 / 6 GB",
      Storage: "64 / 128 GB",
      Battery: "5000 mAh (typical)",
      Charging: "18 W supported; 22.5 W included",
      "Rear camera": "50 + 8 + 2 + 2 MP",
      "Front camera": "8 MP",
      Network: "2G / 3G / 4G",
      Bluetooth: "5.1",
      Weight: "181 g",
      Security: "Side fingerprint sensor",
      Ports: "USB-C; 3.5 mm audio",
      "Launch software": "MIUI 12.5 / Android 11",
    },
  },
];
