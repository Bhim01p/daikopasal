import { useState } from "react";
import type { Product } from "../types";
import { useT } from "../context/LanguageContext";
import { money } from "../data/shop";
import { calculateEmi } from "../../../shared/emi.mjs";
export default function EmiCalculator({ product }: { product: Product }) {
  const t = useT();
  const terms = product.emi;
  const minimum = terms
    ? Math.ceil((product.price * terms.minimumDownPercent) / 100)
    : 0;
  const [down, setDown] = useState(minimum);
  const [months, setMonths] = useState(terms?.months?.[0] || 6);
  if (!terms?.enabled || product.category === "accessory" || product.price <= 0)
    return null;
  let result: ReturnType<typeof calculateEmi> | null = null;
  try {
    if (down >= minimum && terms.months.includes(months))
      result = calculateEmi(
        product.price,
        down,
        terms.annualRate,
        months,
        terms.fee,
        terms.method,
      );
  } catch {
    /* Invalid inputs show a message, never a misleading estimate. */
  }
  return (
    <details className="emi-calculator">
      <summary>
        {t("EMI calculator")} <span>{t("Estimate only")}</span>
      </summary>
      <p>
        {t(
          "Final eligibility and finance terms must be confirmed with the shop. This does not apply for credit.",
        )}
      </p>
      <div className="emi-inputs">
        <label>
          {t("Down payment (NPR)")}
          <input
            type="number"
            min={minimum}
            max={Math.max(0, product.price - 1)}
            step={1}
            value={Number.isFinite(down) ? down : ""}
            onChange={(e) =>
              setDown(e.target.value === "" ? NaN : Number(e.target.value))
            }
          />
          <small>
            {t("Minimum")} {money(minimum)}
          </small>
        </label>
        <label>
          {t("Repayment period")}
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            {terms.months.map((m) => (
              <option value={m} key={m}>
                {m} {t("months")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="summary-note">
        {t("Annual interest")}: {terms.annualRate}% ·{" "}
        {t(terms.method === "flat" ? "Flat interest" : "Reducing balance")} ·{" "}
        {t("Upfront fee")}: {money(terms.fee)}
      </p>
      {result ? (
        <dl className="emi-results">
          <div>
            <dt>{t("Estimated monthly payment")}</dt>
            <dd>{money(Math.round(result.monthly))}</dd>
          </div>
          <div>
            <dt>{t("Pay upfront")}</dt>
            <dd>{money(Math.round(result.upfront))}</dd>
          </div>
          <div>
            <dt>{t("Estimated interest")}</dt>
            <dd>{money(Math.round(result.interest))}</dd>
          </div>
          <div>
            <dt>{t("Total payable")}</dt>
            <dd>{money(Math.round(result.total))}</dd>
          </div>
        </dl>
      ) : (
        <p role="alert">
          {t("Enter a down payment between the minimum and the phone price.")}
        </p>
      )}
    </details>
  );
}
