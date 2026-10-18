export type Category = "new" | "used" | "accessory";
export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  profileComplete: boolean;
  hasPassword?: boolean;
  photo?: string;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  ram?: number;
  storage?: number;
  image: string;
  images?: string[];
  catalogueImage?: { url: string; deviceId: string; attributionRequired: boolean; sourceUrl: string; license: string; images?: { url: string; sourceUrl?: string; license?: string; attributionRequired?: boolean; position?: number }[] };
  catalogueDescription?: { en: string; ne: string; deviceId: string };
  color: string;
  available: boolean;
  stockQuantity: number | null;
  stockVersion: number;
  isSample?: boolean;
  priceIsEstimate?: boolean;
  description: string;
  descriptionNe?: string;
  specs: Record<string, string>;
  condition?: "Like New" | "Excellent" | "Good" | "Fair";
  battery?: number;
  inspection?: {
    checks: Record<"screen" | "cameras" | "charging" | "speakers" | "buttons", "not_checked" | "passed" | "issue">;
    defects: string;
    included: string;
    inspectedAt?: string | null;
  };
  reviewedAt?: string | null;
  accessoryCategory?: string;
  specVariant?: string;
  specSourceUrl?: string;
  emi?: {
    enabled: boolean;
    annualRate: number;
    months: number[];
    minimumDownPercent: number;
    fee: number;
    method: "reducing" | "flat";
  };
  added: number;
}
export interface CartItem {
  productId: string;
  quantity: number;
}
export interface Order {
  id: string;
  name: string;
  phone: string;
  email?: string;
  note: string;
  items: { product: Product; quantity: number }[];
  total: number;
  date: string;
  status:
    | "Awaiting shop confirmation"
    | "Confirmed"
    | "Ready for pickup"
    | "Completed"
    | "Cancelled";
  fulfillment: "Shop pickup";
  fulfillmentMethod?: "PICKUP" | "DELIVERY";
  deliveryFee?: number;
  deliveryAddress?: Record<string, string> | null;
  payment?: { orderId?: string; method: "MANUAL_QR" | "PAY_AT_SHOP" | "ESEWA"; status: string; amount?: number; currency?: string; provider?: string; reference?: string; customerReference?: string; providerTransactionId?: string; verificationType?: "ADMIN" | "GATEWAY"; verifiedAt?: string; verifiedBy?: string; createdAt?: string; updatedAt?: string; submittedAt?: string; reviewedAt?: string; reviewedBy?: string };
  language?: "en" | "ne";
  receiptToken?: string;
  accountOrder?: boolean;
  billIssued?: boolean;
  handover?: { date: string; by?: string };
  history?: { status: Order["status"]; date: string }[];
  emailNotifications?: {
    id: string;
    kind: "received" | "status";
    orderStatus: Order["status"];
    state: "queued" | "accepted" | "failed";
    createdAt: string;
    acceptedAt?: string;
    error?: string;
  }[];
}

