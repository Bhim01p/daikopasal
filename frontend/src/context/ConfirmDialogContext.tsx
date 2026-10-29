import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useT } from "./LanguageContext";

type PendingConfirmation = {
  message: string;
  resolve: (accepted: boolean) => void;
};

const ConfirmDialogContext = createContext<
  ((message: string) => Promise<boolean>) | null
>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [active, setActive] = useState<PendingConfirmation | null>(null);
  const activeRef = useRef<PendingConfirmation | null>(null);
  const queue = useRef<PendingConfirmation[]>([]);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      const request = { message, resolve };
      if (!activeRef.current) {
        activeRef.current = request;
        setActive(request);
      } else {
        queue.current.push(request);
      }
    });
  }, []);

  const settle = (accepted: boolean) => {
    activeRef.current?.resolve(accepted);
    const next = queue.current.shift() || null;
    activeRef.current = next;
    setActive(next);
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {active && (
        <div className="app-dialog-backdrop">
          <section
            className="app-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            aria-describedby="app-confirm-message"
          >
            <h2 id="app-confirm-title">{t("Please confirm")}</h2>
            <p id="app-confirm-message">{active.message}</p>
            <div className="app-confirm-actions">
              <button
                type="button"
                className="button white"
                onClick={() => settle(false)}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="button dark"
                autoFocus
                onClick={() => settle(true)}
              >
                {t("Continue")}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm)
    throw new Error("ConfirmDialogProvider is missing from the app tree.");
  return confirm;
}
