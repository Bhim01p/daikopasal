import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { Moon, Sun } from "lucide-react";
import { useT } from "./LanguageContext";

type Theme = "light" | "dark";
const Context = createContext({ theme: "light" as Theme, toggle: () => {} });
function readTheme(): Theme {
  try {
    return localStorage.getItem("me-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#130f13" : "#faf8f8");
  }, [theme]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "me-theme" || event.key === null) setTheme(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem("me-theme", next);
    } catch {
      /* Choice still works for this visit. */
    }
    setTheme(next);
  }
  return (
    <Context.Provider value={{ theme, toggle }}>{children}</Context.Provider>
  );
}
export function ThemeSwitch() {
  const { theme, toggle } = useContext(Context);
  const t = useT();
  const label = t(
    theme === "light" ? "Switch to dark theme" : "Switch to light theme",
  );
  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  );
}
