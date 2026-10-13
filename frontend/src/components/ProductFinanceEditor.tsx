import type { Product } from "../types";
import { useT } from "../context/LanguageContext";
export default function ProductFinanceEditor({
  draft,
  onChange,
}: {
  draft: Product;
  onChange: (p: Product) => void;
}) {
  const t = useT();
  const terms = {
    enabled: false,
    annualRate: 0,
    months: [6, 12],
    minimumDownPercent: 20,
    fee: 0,
    method: "reducing" as const,
    ...draft.emi,
  };
  const update = (values: Partial<typeof terms>) =>
    onChange({ ...draft, emi: { ...terms, ...values } });
  return (
    <fieldset className="editor-section">
      <legend>{t("Comparison sources & EMI")}</legend>
      <label htmlFor="product-spec-variant">
        {t("Exact model / regional variant")}
      </label>
      <input
        id="product-spec-variant"
        value={draft.specVariant || ""}
        maxLength={180}
        onChange={(e) => onChange({ ...draft, specVariant: e.target.value })}
      />
      <label htmlFor="product-spec-source">
        {t("Specification source URL")}
      </label>
      <input
        id="product-spec-source"
        type="url"
        placeholder="https://"
        value={draft.specSourceUrl || ""}
        onChange={(e) => onChange({ ...draft, specSourceUrl: e.target.value })}
      />
      <p className="summary-note">
        {t(
          "Enter specifications below after checking the exact variant against this source. No automatic website fetching is performed.",
        )}
      </p>
      {draft.category !== "accessory" && (
        <>
          <label className="emi-enable">
            <input
              type="checkbox"
              checked={terms.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            {t("Offer an EMI estimate for this phone")}
          </label>
          {terms.enabled && (
            <div className="emi-admin-fields">
              <label>
                {t("Annual interest (%)")}
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={terms.annualRate}
                  onChange={(e) =>
                    update({ annualRate: Number(e.target.value) })
                  }
                  required
                />
              </label>
              <label>
                {t("Minimum down payment (%)")}
                <input
                  type="number"
                  min={0}
                  max={99}
                  step="0.01"
                  value={terms.minimumDownPercent}
                  onChange={(e) =>
                    update({ minimumDownPercent: Number(e.target.value) })
                  }
                  required
                />
              </label>
              <label>
                {t("Upfront fee (NPR)")}
                <input
                  type="number"
                  min={0}
                  max={10000000}
                  value={terms.fee}
                  onChange={(e) => update({ fee: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                {t("Interest method")}
                <select
                  value={terms.method}
                  onChange={(e) =>
                    update({ method: e.target.value as "flat" | "reducing" })
                  }
                >
                  <option value="reducing">{t("Reducing balance")}</option>
                  <option value="flat">{t("Flat interest")}</option>
                </select>
              </label>
              <div>
                <span>{t("Available periods")}</span>
                <div className="emi-periods">
                  {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                    <label key={m}>
                      <input
                        type="checkbox"
                        checked={terms.months.includes(m)}
                        onChange={(e) =>
                          update({
                            months: e.target.checked
                              ? [...terms.months, m].sort((a, b) => a - b)
                              : terms.months.filter((n) => n !== m),
                          })
                        }
                      />
                      {m} {t("months")}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
