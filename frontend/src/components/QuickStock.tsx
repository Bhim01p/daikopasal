import { useState } from "react";
import { api } from "../utils/api";
import { useT } from "../context/LanguageContext";
import type { Product } from "../types";
export default function QuickStock({
  product,
  disabled,
  onSaved,
  onError,
}: {
  product: Product;
  disabled: boolean;
  onSaved: () => Promise<unknown>;
  onError: (error: unknown) => void;
}) {
  const t = useT();
  const [edit, setEdit] = useState<{
    quantity: string;
    version: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  if (!edit)
    return (
      <button
        className="quick-stock-button"
        disabled={disabled}
        onClick={() =>
          setEdit({
            quantity: String(product.stockQuantity ?? 0),
            version: product.stockVersion,
          })
        }
        aria-label={t("Update stock for {{name}}", { name: product.name })}
      >
        {t("Update stock")}
      </button>
    );
  return (
    <form
      className="quick-stock"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await api(`/admin/products/${encodeURIComponent(product.id)}/stock`, {
            method: "PATCH",
            body: JSON.stringify({
              stockQuantity: Number(edit.quantity),
              stockVersion: edit.version,
            }),
          });
          await onSaved();
          setEdit(null);
        } catch (error) {
          onError(error);
          await onSaved();
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        type="number"
        min={0}
        max={1000000}
        step={1}
        required
        autoFocus
        aria-label={t("Stock quantity for {{name}}", { name: product.name })}
        value={edit.quantity}
        onChange={(e) => setEdit({ ...edit, quantity: e.target.value })}
      />
      <button disabled={saving || disabled}>
        {t(saving ? "Saving…" : "Save stock")}
      </button>
      <button type="button" disabled={saving} onClick={() => setEdit(null)}>
        {t("Cancel")}
      </button>
    </form>
  );
}
