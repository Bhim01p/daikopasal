import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem } from "../types";
import { useProducts } from "./ProductContext";
import type { Product } from "../types";
import { purchaseLimit } from "../utils/products";
const CartContext = createContext<{
  items: CartItem[];
  add: (id: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  count: number;
  total: number;
  notice: string;
  dismiss: () => void;
} | null>(null);
function readCart(products: Product[]): CartItem[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem("me-cart") || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (i): i is CartItem =>
              !!i &&
              typeof i.productId === "string" &&
              products.some((p) => p.id === i.productId && p.available) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 10,
          )
          .filter(
            (i, index, array) =>
              array.findIndex((other) => other.productId === i.productId) ===
              index,
          )
      : [];
  } catch {
    return [];
  }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [items, setItems] = useState<CartItem[]>(() => readCart(products));
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const valid = items.flatMap((item) => {
      const product = products.find((product) => product.id === item.productId);
      const maximum = product ? purchaseLimit(product) : 0;
      return maximum
        ? [{ ...item, quantity: Math.min(item.quantity, maximum) }]
        : [];
    });
    if (
      valid.length !== items.length ||
      valid.some((item, index) => item.quantity !== items[index].quantity)
    ) {
      setItems(valid);
      setNotice(
        "Stock changed. We updated your bag to the available quantities.",
      );
    }
  }, [products, items]);
  useEffect(() => {
    try {
      localStorage.setItem("me-cart", JSON.stringify(items));
    } catch {
      setNotice("Your browser could not save your cart. Keep this page open.");
    }
  }, [items]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const add = (id: string, quantity = 1) => {
    const product = products.find((p) => p.id === id);
    if (!product?.available || !Number.isInteger(quantity) || quantity < 1)
      return;
    const maximum = purchaseLimit(product);
    const previous = items.find((item) => item.productId === id)?.quantity ?? 0;
    if (previous >= maximum) {
      setNotice(
        `Your bag already has the available quantity of ${product.name}.`,
      );
      return;
    }
    setItems((current) => {
      const existing = current.find((i) => i.productId === id);
      return existing
        ? current.map((i) =>
            i.productId === id
              ? { ...i, quantity: Math.min(maximum, i.quantity + quantity) }
              : i,
          )
        : [
            ...current,
            { productId: id, quantity: Math.min(maximum, quantity) },
          ];
    });
    setNotice(
      previous + quantity > maximum
        ? `Only ${maximum} of ${product.name} are available. Your bag has been updated.`
        : `${product.name} added to your bag`,
    );
  };
  const setQuantity = (id: string, quantity: number) => {
    if (!Number.isInteger(quantity)) return;
    const product = products.find((product) => product.id === id);
    const maximum = product ? purchaseLimit(product) : 0;
    setItems((current) =>
      quantity <= 0 || !maximum
        ? current.filter((i) => i.productId !== id)
        : current.map((i) =>
            i.productId === id
              ? { ...i, quantity: Math.min(maximum, quantity) }
              : i,
          ),
    );
  };
  return (
    <CartContext.Provider
      value={{
        items,
        add,
        setQuantity,
        clear: () => setItems([]),
        count: items.reduce((s, i) => s + i.quantity, 0),
        total: items.reduce(
          (s, i) =>
            s +
            (products.find((p) => p.id === i.productId)?.price || 0) *
              i.quantity,
          0,
        ),
        notice,
        dismiss: () => setNotice(""),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
