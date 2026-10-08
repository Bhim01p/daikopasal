export type Category = "new" | "used" | "accessory";
export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string;
  profileComplete: boolean;
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
  color: string;
  available: boolean;
  stockQuantity: number | null;
  stockVersion: number;
  isSample?: boolean;
  description: string;
  specs: Record<string, string>;
  condition?: "Like New" | "Excellent" | "Good" | "Fair";
  battery?: number;
  accessoryCategory?: string;
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
  receiptToken?: string;
  accountOrder?: boolean;
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
