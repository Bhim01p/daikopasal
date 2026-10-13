import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { api } from "../utils/api";
import type { Customer } from "../types";

type Mode = "disabled" | "development" | "sms" | "email";
const Context = createContext<{
  customer: Customer | null;
  checking: boolean;
  mode: Mode;
  error: string;
  refresh: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
  logout: () => Promise<void>;
} | null>(null);
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, updateCustomer] = useState<Customer | null>(null);
  const generation = useRef(0);
  const setCustomer = useCallback((value: Customer | null) => {
    generation.current++;
    updateCustomer(value);
  }, []);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<Mode>("disabled");
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await api<{ customer: Customer | null; mode: Mode }>(
        "/customer/session",
      );
      if (current === generation.current) {
        updateCustomer(result.customer);
        setMode(result.mode);
        setError("");
      }
    } catch {
      if (current === generation.current)
        setError("We could not check your login. Please try again.");
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [refresh]);
  async function logout() {
    await api("/customer/logout", { method: "POST", body: "{}" });
    setCustomer(null);
  }
  return (
    <Context.Provider
      value={{ customer, checking, mode, error, refresh, setCustomer, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export function useCustomer() {
  const context = useContext(Context);
  if (!context) throw new Error("CustomerProvider is missing");
  return context;
}
