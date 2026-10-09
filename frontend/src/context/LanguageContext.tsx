import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { translate } from "../../../shared/locale.mjs";
export type Language = "en" | "ne";
let activeLanguage: Language = "en";
export const currentLanguage = () => activeLanguage;
export const translateCurrent = (
  key: string,
  values?: Record<string, string | number>,
) => translate(key, activeLanguage, values);
const Context = createContext({
  language: "en" as Language,
  setLanguage: (_: Language) => {},
});
function readLanguage(key: string): Language {
  try {
    return localStorage.getItem(key) === "ne" ? "ne" : "en";
  } catch {
    return "en";
  }
}
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const admin = pathname === "/admin";
  const [customerLanguage, setCustomerLanguage] = useState<Language>(() =>
    readLanguage("me-language"),
  );
  const [adminLanguage, setAdminLanguage] = useState<Language>(() =>
    readLanguage("me-admin-language"),
  );
  const language = admin ? adminLanguage : customerLanguage;
  activeLanguage = language;
  const setLanguage = useCallback(
    (value: Language) => {
      (admin ? setAdminLanguage : setCustomerLanguage)(value);
      try {
        localStorage.setItem(
          admin ? "me-admin-language" : "me-language",
          value,
        );
      } catch {
        /* Preference still applies for this session. */
      }
    },
    [admin],
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return (
    <Context.Provider value={{ language, setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
export function useT() {
  const { language } = useLanguage();
  return useCallback(
    (
      key: string | undefined | null,
      values?: Record<string, string | number>,
    ) => translate(key, language, values),
    [language],
  );
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <label className="language-switch">
      <span className="sr-only">{translate("Language", language)}</span>
      <select
        aria-label={translate("Language", language)}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        <option value="en">English</option>
        <option value="ne">नेपाली</option>
      </select>
    </label>
  );
}
