import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* Session-only when storage is unavailable. */
    }
  }, [ids]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key) setIds(read());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
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
