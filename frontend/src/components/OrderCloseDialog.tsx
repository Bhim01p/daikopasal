import { useEffect, useRef, useState } from "react";
import { useT } from "../context/LanguageContext";
import type { Order } from "../types";
export default function OrderCloseDialog({
  value,
  busy,
  onCancel,
  onConfirm,
}: {
  value: { order: Order; status: "Completed" | "Cancelled" };
  busy: boolean;
  onCancel: () => void;
  onConfirm: (pickupReference?: string) => Promise<void>;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [pickupReference, setPickupReference] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="order-close-dialog"
      aria-labelledby="close-order-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="close-order-title">
        {t(
          value.status === "Completed"
            ? "Complete this pickup?"
            : "Cancel this order?",
        )}
      </h2>
      <p>
        {value.order.id} · {value.order.name}
      </p>
      <p>
        {t(
          value.status === "Completed"
            ? "Confirm that the customer has collected the items. Stock stays reserved and this order will be closed."
            : "Reserved units will return to stock and this order will be closed.",
        )}
      </p>
      <p>
        {t(
          "A customer email update will be queued. This action cannot be undone.",
        )}
      </p>
      {value.status === "Completed" && (
        <label>
          {t("Enter the customer's order reference to verify handover")}
          <input value={pickupReference} onChange={(event) => setPickupReference(event.target.value.trim().toUpperCase())} autoComplete="off" />
        </label>
      )}
      <div className="button-row">
        <button
          className="button white"
          disabled={busy}
          onClick={onCancel}
          autoFocus
        >
          {t("Go back")}
        </button>
        <button
          className="button dark"
          disabled={busy || (value.status === "Completed" && pickupReference !== value.order.id)}
          onClick={() => void onConfirm(pickupReference)}
        >
          {t(
            busy
              ? "Saving…"
              : value.status === "Completed"
                ? "Complete pickup"
                : "Cancel order",
          )}
        </button>
      </div>
    </dialog>
  );
}
