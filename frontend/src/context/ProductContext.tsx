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
  if (loading)
    return (
      <div className="container empty-state" role="status">
        <h1>Opening the shop…</h1>
        <p>Loading the current catalogue.</p>
      </div>
    );
  if (error)
    return (
      <div className="container empty-state">
        <h1>Let’s reconnect.</h1>
        <p role="alert">{error}</p>
        <button className="button dark" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  return (
    <ProductContext.Provider value={{ products, refresh }}>
      {children}
    </ProductContext.Provider>
  );
}
export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("ProductProvider is missing");
  return context;
}
