import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Product } from "../types";
import { api } from "../utils/api";
const ProductContext = createContext<{
  products: Product[];
  loading: boolean;
  error: string;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
} | null>(null);
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const result = await api<{ products: Product[] }>("/products");
    setProducts(result.products);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch {
      setError(
        "The shop catalogue is unavailable. Please start the backend or try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    void load();
    const onFocus = () => {
      void refresh().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, refresh]);
  return (
    <ProductContext.Provider value={{ products, loading, error, retry: load, refresh }}>
      {children}
    </ProductContext.Provider>
  );
}
export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("ProductProvider is missing");
  return context;
}
