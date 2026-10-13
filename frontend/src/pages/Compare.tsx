import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useT } from "../context/LanguageContext";
import { referencePhones } from "../data/referencePhones";
import { money } from "../data/shop";
export default function Compare() {
  const t = useT();
  const { products } = useProducts();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [differences, setDifferences] = useState(false);
  const models = [
    ...referencePhones.map((p) => ({
      ...p,
      price: undefined as number | undefined,
      slug: "",
      available: false,
      estimated: false,
      origin: "Manufacturer reference",
    })),
    ...products
      .filter((p) => p.category !== "accessory")
      .map((p) => ({
        id: p.id,
        name: p.name,
        variant:
          p.specVariant ||
          `${p.brand} · ${p.ram || "?"} GB / ${p.storage || "?"} GB · ${p.category === "used" ? "Used" : "New"}`,
        sourceUrl: p.specSourceUrl || "",
        checkedAt: "",
        specs: p.specs,
        price: p.price,
        slug: p.slug,
        available: p.available,
        estimated: p.priceIsEstimate === true,
        origin: "Shop specifications",
      })),
  ];
  const first = models.find((p) => p.id === params.get("first"));
  const second = models.find((p) => p.id === params.get("second"));
  const filtered = models.filter((p) =>
    (p.name + " " + p.variant).toLowerCase().includes(query.toLowerCase()),
  );
  const keys = [
    ...new Set([
      ...Object.keys(first?.specs || {}),
      ...Object.keys(second?.specs || {}),
    ]),
  ];
  function pick(slot: string, id: string) {
    const next = new URLSearchParams(params);
    if (id) next.set(slot, id);
    else next.delete(slot);
    setParams(next, { replace: true });
  }
  return (
    <section className="container standard-page compare-page">
      <span className="eyebrow">{t("Find your fit")}</span>
      <h1>{t("Compare phones")}</h1>
      <p className="muted">
        {t(
          "Compare exact variants using saved specifications and linked sources. Reference models are not shop stock.",
        )}
      </p>
      <label className="comparison-search">
        {t("Find a model")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search models, for example Redmi 9")}
        />
      </label>
      <div className="comparison-selectors">
        {["first", "second"].map((slot, i) => (
          <label key={slot}>
            {t(i === 0 ? "First phone" : "Second phone")}
            <select
              value={params.get(slot) || ""}
              onChange={(e) => pick(slot, e.target.value)}
            >
              <option value="">{t("Select a phone")}</option>
              {models
                .filter(
                  (p) => filtered.includes(p) || p.id === params.get(slot),
                )
                .map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={
                      p.id === params.get(slot === "first" ? "second" : "first")
                    }
                  >
                    {p.name} — {p.variant}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      {!filtered.length && (
        <p role="status">
          {t(
            "No saved model matches. More verified models can be added later.",
          )}
        </p>
      )}
      {first && second ? (
        <>
          <label className="comparison-differences">
            <input
              type="checkbox"
              checked={differences}
              onChange={(e) => setDifferences(e.target.checked)}
            />
            {t("Show differences only")}
          </label>
          <div
            className="comparison-scroll"
            tabIndex={0}
            aria-label={t("Phone comparison table")}
          >
            <table className="comparison-table">
              <caption>{t("Specifications comparison")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("Specification")}</th>
                  {[first, second].map((p) => (
                    <th scope="col" key={p.id}>
                      <strong>{p.name}</strong>
                      <small>{p.variant}</small>
                      <small>{t(p.origin)}</small>
                      {p.sourceUrl ? (
                        <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                          {t("Specification source")} ↗
                        </a>
                      ) : (
                        <small>{t("Source not supplied by shop")}</small>
                      )}
                      {p.checkedAt && (
                        <small>
                          {t("Verified on")} {p.checkedAt}
                        </small>
                      )}
                      {p.price !== undefined ? (
                        <>
                          <small>
                            {money(p.price)}
                            {p.estimated ? ` · ${t("Estimated price")}` : ""}
                          </small>
                          <Link to={"/product/" + p.slug}>
                            {t("View details")}
                          </Link>
                        </>
                      ) : (
                        <small>
                          {t("Reference only — availability not confirmed")}
                        </small>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys
                  .filter(
                    (k) => !differences || first.specs[k] !== second.specs[k],
                  )
                  .map((k) => (
                    <tr
                      key={k}
                      className={
                        first.specs[k] &&
                        second.specs[k] &&
                        first.specs[k] !== second.specs[k]
                          ? "different"
                          : ""
                      }
                    >
                      <th scope="row">{t(k)}</th>
                      <td>{first.specs[k] || t("Not provided")}</td>
                      <td>{second.specs[k] || t("Not provided")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="summary-note">
            {t(
              "Highlighted rows differ; higher numbers do not always mean a better phone. Region, configuration and software updates can change specifications.",
            )}
          </p>
        </>
      ) : (
        <div className="comparison-empty">
          <h2>{t("Choose two phones to compare")}</h2>
          <p>
            {t(
              "Try Redmi 9 and Redmi 10 from the manufacturer reference library.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
