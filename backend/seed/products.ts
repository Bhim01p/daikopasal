import type { Product } from "../../frontend/src/types";
const phone = "/assets/phone.svg";
const phones = [
  ["Samsung", "Galaxy A55 5G", 47999, 8, 256, "#aecac9"],
  ["Apple", "iPhone 15", 109999, 6, 128, "#b4ced0"],
  ["Xiaomi", "Redmi Note 13 Pro", 34999, 8, 256, "#c3b4d7"],
  ["Nothing", "Phone (2a)", 45999, 8, 128, "#e7e8e1"],
  ["OnePlus", "Nord CE4", 42999, 8, 256, "#98bca8"],
  ["Realme", "12 Pro", 39999, 8, 256, "#b9c5d9"],
  ["Vivo", "V30", 59999, 12, 256, "#c4d9e2"],
  ["Oppo", "Reno11", 54999, 8, 256, "#bccbbf"],
  ["Honor", "X9b", 43999, 12, 256, "#e3bf9f"],
  ["Samsung", "Galaxy S24", 99999, 8, 256, "#bdb7ce"],
] as const;
const used = [
  ["Apple", "iPhone 13", 55000, 4, 128, "Excellent", 89, "#c8d6c6"],
  ["Samsung", "Galaxy S22", 42000, 8, 128, "Good", 85, "#c6c0cb"],
  ["Apple", "iPhone 12", 39000, 4, 128, "Good", 84, "#b3c6d6"],
  ["OnePlus", "9 Pro", 32000, 8, 256, "Excellent", 90, "#bfcac6"],
  ["Xiaomi", "Redmi Note 12", 15500, 6, 128, "Fair", 82, "#becbd4"],
  ["Apple", "iPhone 14", 69000, 6, 128, "Like New", 95, "#cfc4da"],
  ["Vivo", "V27", 28000, 8, 256, "Excellent", 91, "#b8cec0"],
] as const;
const accessories = [
  ["Soft-touch phone cover", "Mobile Covers", 650, "cover"],
  ["Clear protective case", "Mobile Covers", 450, "cover"],
  ["USB-C wall charger", "Chargers", 1800, "charger"],
  ["20W charging adapter", "Chargers", 2400, "charger"],
  ["Wireless everyday earbuds", "Earbuds", 2800, "earbuds"],
  ["Compact wireless earbuds", "Earbuds", 1900, "earbuds"],
  ["Tempered glass protector", "Screen Protectors", 350, "cover"],
  ["Privacy screen protector", "Screen Protectors", 600, "cover"],
  ["Portable Bluetooth speaker", "Speakers", 3200, "speaker"],
  ["Mini desktop speaker", "Speakers", 1600, "speaker"],
  ["Wired in-ear earphones", "Earphones", 700, "earbuds"],
  ["USB-C earphones", "Earphones", 1200, "earbuds"],
  ["LED bulb 9W", "Bulbs", 250, "bulb"],
  ["LED bulb 12W", "Bulbs", 350, "bulb"],
  ["USB-C charging cable", "Other Accessories", 550, "charger"],
  ["Adjustable phone stand", "Other Accessories", 800, "cover"],
] as const;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, "");
export const products: Product[] = [
  ...phones.map((p, i) => ({
    id: `new-${i}`,
    slug: slugify(`${p[0]}-${p[1]}`),
    brand: p[0],
    name: p[1],
    category: "new" as const,
    price: p[2],
    ram: p[3],
    storage: p[4],
    color: p[5],
    image: phone,
    available: i !== 8,
    description: `Explore the ${p[0]} ${p[1]} for your everyday calls, photos, and apps. This listing uses sample specifications and pricing; please confirm the exact variant with the shop.`,
    specs: {
      RAM: `${p[3]} GB`,
      Storage: `${p[4]} GB`,
      Connectivity: "Confirm with shop",
      Warranty: "Please confirm with shop",
    },
    added: 100 - i,
  })),
  ...used.map((p, i) => ({
    id: `used-${i}`,
    slug: slugify(`used-${p[0]}-${p[1]}`),
    brand: p[0],
    name: p[1],
    category: "used" as const,
    price: p[2],
    ram: p[3],
    storage: p[4],
    condition: p[5],
    battery: p[6],
    color: p[7],
    image: phone,
    available: i !== 4,
    description: `A sample second-hand ${p[0]} ${p[1]} listing. Condition and battery health are demonstration values. Ask the shop about the actual set, inspection details, and included accessories before buying.`,
    specs: {
      RAM: `${p[3]} GB`,
      Storage: `${p[4]} GB`,
      Warranty: "To be confirmed with shop",
    },
    added: 90 - i,
  })),
  ...accessories.map((p, i) => ({
    id: `accessory-${i}`,
    slug: slugify(p[0]),
    brand: "Accessories",
    name: p[0],
    category: "accessory" as const,
    accessoryCategory: p[1],
    price: p[2],
    image: `/assets/${p[3]}.svg`,
    color: "#c1d4d1",
    available: i !== 9,
    description: `A useful everyday essential. This is a sample listing; please confirm compatibility, brand, and availability with the shop.`,
    specs: {
      Category: p[1],
      Compatibility: "Confirm with shop",
      Warranty: "Please confirm with shop",
    },
    added: 80 - i,
  })),
];
export const accessoryCategories = [...new Set(accessories.map((p) => p[1]))];

