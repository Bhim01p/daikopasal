import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Product } from "../types";
import { api } from "../utils/api";
const catalogueCacheKey = "me-catalogue-cache-v1";
function readCachedProducts(): Product[] {
  try {
    const value = JSON.parse(localStorage.getItem(catalogueCacheKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
const ProductContext = createContext<{
  products: Product[];
  loading: boolean;
  error: string;
  retry: () => Promise<void>;
  refresh: (force?: boolean) => Promise<void>;
} | null>(null);
export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(readCachedProducts);
  const [loading, setLoading] = useState(() => readCachedProducts().length === 0);
  const [error, setError] = useState("");
  const lastRefresh = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (inFlight.current) return inFlight.current;
    if (!force && now - lastRefresh.current < 30000) return;
    lastRefresh.current = now;
    const request = api<{ products: Product[] }>("/products")
      .then((result) => {
        setProducts(result.products);
        try { localStorage.setItem(catalogueCacheKey, JSON.stringify(result.products)); } catch { /* cache is optional */ }
      })
      .finally(() => { inFlight.current = null; });
    inFlight.current = request;
    return request;
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
