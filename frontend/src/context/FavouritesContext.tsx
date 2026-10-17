import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useProducts } from "./ProductContext";
const key = "me-favourites-v1";
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string").slice(0, 200)
      : [];
  } catch {
    return [];
  }
}
const Context = createContext<{ ids: string[]; toggle: (id: string) => void }>({
  ids: [],
  toggle: () => {},
});
export function FavouritesProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* Session-only when storage is unavailable. */
    }
  }, [ids]);
  useEffect(() => {
    if (!products.length) return;
    const valid = new Set(products.map((product) => product.id));
    setIds((current) => current.filter((id) => valid.has(id)));
  }, [products]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key) setIds(read());
    };
    const clearOnLogout = () => {
      setIds([]);
      try { localStorage.removeItem(key); } catch { /* Session-only when storage is unavailable. */ }
    };
    window.addEventListener("storage", sync);
    window.addEventListener("customer-logout", clearOnLogout);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("customer-logout", clearOnLogout);
    };
  }, []);
  return (
    <Context.Provider
      value={{
        ids,
        toggle: (id) =>
          setIds((current) =>
            current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id].slice(-200),
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useFavourites = () => useContext(Context);
