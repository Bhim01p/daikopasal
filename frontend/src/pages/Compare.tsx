import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useProducts } from "../context/ProductContext";
import { useT } from "../context/LanguageContext";
import type { ReferencePhone } from "../data/referencePhones";
import { api } from "../utils/api";
import { money } from "../data/shop";
import { productImageSource } from "../utils/products";
import SafeImage from "../components/SafeImage";
export default function Compare() {
  const t = useT();
  const { products } = useProducts();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [differences, setDifferences] = useState(false);
  const [referencePhones, setReferencePhones] = useState<ReferencePhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [brand, setBrand] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    api<{ phones: ReferencePhone[] }>("/reference-phones")
      .then(({ phones }) => {
        if (active) setReferencePhones(phones);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const models = [
    ...referencePhones.map((p) => ({
      ...p,
      price: undefined as number | undefined,
      slug: "",
      available: false,
      estimated: false,
      origin:
        p.provenance === "Manufacturer reference"
          ? "Manufacturer reference"
          : "Reference specifications",
    })),
    ...products
      .filter((p) => p.category !== "accessory")
      .map((p) => ({
        id: p.id,
        brand: p.brand,
        name: p.name,
        variant:
          p.specVariant ||
          `${p.brand} · ${p.ram || "?"} GB / ${p.storage || "?"} GB · ${p.category === "used" ? "Used" : "New"}`,
        sourceUrl: p.specSourceUrl || "",
        sourceUrls: p.specSourceUrl ? [p.specSourceUrl] : [],
        checkedAt: "",
        specs: p.specs,
        price: p.price,
        slug: p.slug,
        available: p.available,
        estimated: p.priceIsEstimate === true,
        origin: "Shop specifications",
        image: productImageSource(p),
      })),
  ];
  const first = models.find((p) => p.id === params.get("first"));
  const second = models.find((p) => p.id === params.get("second"));
  const filtered = models.filter(
    (p) =>
      (!brand || p.brand === brand) &&
      query
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .every((word) =>
          (p.brand + " " + p.name + " " + p.variant)
            .toLowerCase()
            .includes(word),
        ),
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
      <div className="comparison-search-tools">
        <label className="comparison-search">
          {t("Find your second phone")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search models, for example Redmi 9")}
          />
        </label>
        <label>
          {t("Brand")}
          <select
            aria-label={t("Brand")}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">{t("All brands")}</option>
            {[...new Set(models.map((p) => p.brand).filter(Boolean))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
      </div>
      {loading && <p role="status">{t("Loading reference phones…")}</p>}
      {error && (
        <div role="alert">
          <p>{t("Reference phones could not be loaded. Please try again.")}</p>
          <button
            className="button secondary"
            onClick={() => setReload((n) => n + 1)}
          >
            {t("Try again")}
          </button>
        </div>
      )}
      {!loading && !error && (
        <p className="muted">
          {t("Reference catalogue")}: {referencePhones.length}{" "}
          {t("configurations")}.{" "}
          {t("Choose the exact region and RAM/storage variant.")}
        </p>
      )}
      <div className="comparison-selectors">
        {["first", "second"].map((slot, i) => (
          <label key={slot}>
            {t(i === 0 ? "First phone" : "Second phone")}
            <select
              aria-label={t(i === 0 ? "First phone" : "Second phone")}
              value={params.get(slot) || ""}
              onChange={(e) => pick(slot, e.target.value)}
            >
              <option value="">{t("Select a phone")}</option>
              {(slot === "first"
                ? models.filter(
                    (p) =>
                      p.origin === "Shop specifications" ||
                      p.id === params.get(slot),
                  )
                : models
              )
                .filter(
                  (p) =>
                    slot === "first" ||
                    filtered.includes(p) ||
                    p.id === params.get(slot),
                )
                .map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={
                      p.id === params.get(slot === "first" ? "second" : "first")
                    }
                  >
                    {p.brand} {p.name} — {p.variant}
                    {p.slug ? ` · ${t("Shop specifications")}` : ""}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      {!loading && !error && !filtered.length && (
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
          <p className="comparison-swipe-hint muted">
            {t("Swipe the table sideways to see both phones.")}
          </p>
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
                      {"image" in p && p.image ? <SafeImage className="comparison-phone-image" src={p.image} alt={`${p.brand} ${p.name}`} /> : null}
                      <strong>{p.name}</strong>
                      <small>{p.variant}</small>
                      <small>{t(p.origin)}</small>
                      {p.sourceUrl ? (
                        (p.sourceUrls?.length
                          ? p.sourceUrls
                          : [p.sourceUrl]
                        ).map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("Specification source")} {i + 1} ↗
                          </a>
                        ))
                      ) : (
                        <small>{t("Source not supplied by shop")}</small>
                      )}
                      {p.checkedAt && (
                        <small>
                          {t("Source checked on")} {p.checkedAt}
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
                          {t("For comparison only — not shop inventory")}
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
                      <td>
                        {["Yes", "No"].includes(first.specs[k])
                          ? t(first.specs[k])
                          : first.specs[k] || t("Not available")}
                      </td>
                      <td>
                        {["Yes", "No"].includes(second.specs[k])
                          ? t(second.specs[k])
                          : second.specs[k] || t("Not available")}
                      </td>
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
              "Choose a shop phone first, then search the reference catalogue for your second phone.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
