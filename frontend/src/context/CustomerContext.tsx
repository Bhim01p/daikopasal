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
  logoutAll: () => Promise<void>;
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
  const lastRefresh = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    if (Date.now() - lastRefresh.current < 30000) return;
    lastRefresh.current = Date.now();
    const current = ++generation.current;
    const request = (async () => {
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
    })().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = request;
    return request;
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
    try {
      // Account orders are server-owned; clear any cached receipt list so a
      // signed-out session cannot continue showing the previous account's order.
      localStorage.removeItem("me-orders");
    } catch {
      /* Storage is optional. */
    }
    window.dispatchEvent(new Event("customer-logout"));
  }
  async function logoutAll() {
    await api("/customer/logout-all", { method: "POST", body: "{}" });
    setCustomer(null);
    try {
      localStorage.removeItem("me-orders");
    } catch {
      /* Storage is optional. */
    }
    window.dispatchEvent(new Event("customer-logout"));
  }
  return (
    <Context.Provider
      value={{
        customer,
        checking,
        mode,
        error,
        refresh,
        setCustomer,
        logout,
        logoutAll,
      }}
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
