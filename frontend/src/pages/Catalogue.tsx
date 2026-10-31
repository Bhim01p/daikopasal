import { referencePhones } from "../data/referencePhones";
import { useT } from "../context/LanguageContext";
import { normalizeDigits } from "../../../shared/locale.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { accessoryCategories } from "../data/categories";
import type { Category } from "../types";
import ProductCard from "../components/ProductCard";
import CategoryNav from "../components/CategoryNav";
import { money } from "../data/shop";
export default function Catalogue({ category }: { category?: Category }) {
  const t = useT();
  const { products } = useProducts();
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState(params.get("budget") || "");
  const [inStock, setInStock] = useState(false);
  const [ram, setRam] = useState("");
  const [storage, setStorage] = useState("");
  const [condition, setCondition] = useState("");
  const [accessory, setAccessory] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showFilters) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowFilters(false);
        filterButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFilters]);
  const base = products.filter((p) => !category || p.category === category);
  const brands = [...new Set(base.map((p) => p.brand))].sort();
  const ramOptions = [
    ...new Set(
      base
        .map((p) => p.ram)
        .filter((value): value is number => Number.isFinite(value)),
    ),
  ].sort((a, b) => a - b);
  const storageOptions = [
    ...new Set(
      base
        .map((p) => p.storage)
        .filter((value): value is number => Number.isFinite(value)),
    ),
  ].sort((a, b) => a - b);
  const conditionOptions = ["Like New", "Excellent", "Good", "Fair"];
  const sortOptions = [
    "newest",
    "low",
    "high",
    "name-asc",
    "name-desc",
    "brand-asc",
  ];
  const priceOptions = [
    ...new Set([
      ...(category === "accessory"
        ? [500, 1000, 2000, 3500]
        : [20000, 35000, 50000, 70000, 100000, 150000]),
      ...base
        .map((p) => p.price)
        .filter(
          (value) => Number.isFinite(value) && value > 0 && value <= 1000000,
        ),
    ]),
  ].sort((a, b) => a - b);
  const updateParam = (name: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    });
  };
  useEffect(() => {
    const rawBudget = params.get("budget") || "";
    setBrand(
      brands.includes(params.get("brand") || "")
        ? params.get("brand") || ""
        : "",
    );
    setBudget(/^\d+(?:\.\d+)?$/.test(rawBudget) ? rawBudget : "");
    setRam(
      ramOptions.some((value) => String(value) === params.get("ram"))
        ? params.get("ram") || ""
        : "",
    );
    setStorage(
      storageOptions.some((value) => String(value) === params.get("storage"))
        ? params.get("storage") || ""
        : "",
    );
    setCondition(
      conditionOptions.includes(params.get("condition") || "")
        ? params.get("condition") || ""
        : "",
    );
    setAccessory(
      accessoryCategories.includes(params.get("accessory") || "")
        ? params.get("accessory") || ""
        : "",
    );
    setSort(
      sortOptions.includes(params.get("sort") || "")
        ? params.get("sort") || "newest"
        : "newest",
    );
    setInStock(
      ["1", "true"].includes((params.get("inStock") || "").toLowerCase()),
    );
  }, [params, products, category]);
  const result = useMemo(
    () =>
      base
        .filter(
          (p) =>
            (!query ||
              `${p.brand} ${p.name} ${p.category} ${p.accessoryCategory || ""} ${t(p.accessoryCategory)} ${p.ram ?? ""} ${p.storage ?? ""} ${p.description || ""} ${p.descriptionNe || ""} ${p.catalogueDescription?.en || ""} ${p.catalogueDescription?.ne || ""} ${Object.entries(
                { ...p.catalogueSpecs?.specs, ...p.specs },
              )
                .flat()
                .join(" ")}`
                .toLowerCase()
                .includes(normalizeDigits(query).toLowerCase())) &&
            (!brand || p.brand === brand) &&
            (!budget || p.price <= Number(budget)) &&
            (!ram || p.ram === Number(ram)) &&
            (!storage || p.storage === Number(storage)) &&
            (!condition || p.condition === condition) &&
            (accessory
              ? p.accessoryCategory === accessory
              : category !== "accessory" ||
                p.accessoryCategory !== "Vehicle Meter Repair Parts") &&
            (!inStock || p.available),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
              : sort === "name-asc"
                ? a.name.localeCompare(b.name)
                : sort === "name-desc"
                  ? b.name.localeCompare(a.name)
                  : sort === "brand-asc"
                    ? a.brand.localeCompare(b.brand) ||
                      a.name.localeCompare(b.name)
                    : b.added - a.added,
        ),
    [
      products,
      category,
      query,
      brand,
      budget,
      ram,
      storage,
      condition,
      accessory,
      sort,
      inStock,
      t,
    ],
  );
  const reset = () => {
    setParams({});
    setBrand("");
    setBudget("");
    setRam("");
    setStorage("");
    setCondition("");
    setAccessory("");
    setInStock(false);
  };
  const active = !!(
    query ||
    brand ||
    budget ||
    ram ||
    storage ||
    condition ||
    accessory ||
    inStock
  );
  const title =
    category === "new"
      ? "Shop new phones"
      : category === "used"
        ? "Shop used phones"
        : category === "accessory"
          ? accessory || "Shop accessories"
          : "Search the shop";
  const filterCount = [
    brand,
    budget,
    ram,
    storage,
    condition,
    accessory,
    inStock,
  ].filter(Boolean).length;
  return (
    <>
      <div
        className={`container catalogue-layout${!category ? " catalogue-search-page" : ""}`}
      >
        <div className="catalogue-results">
          <nav className="breadcrumb" aria-label={t("Breadcrumb")}>
            <Link to="/">{t("Home")}</Link>
            <ArrowRight size={12} />
            <span>{t(title)}</span>
          </nav>
          <div className="catalogue-heading">
            <h1>{t(title)}</h1>
          </div>
          <div className="catalogue-controls">
            <button
              ref={filterButton}
              aria-label={t("Filter")}
              className="catalogue-filter-button button white"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="product-filters"
            >
              <SlidersHorizontal size={18} />
              {t("Filter")}
              {filterCount > 0 && (
                <span className="filter-count">{filterCount}</span>
              )}
            </button>
            <label className="sort-label">
              <span className="sr-only">{t("Sort products")}</span>
              <select
                aria-label={t("Sort products")}
                value={sort}
                onChange={(e) =>
                  updateParam(
                    "sort",
                    e.target.value === "newest" ? "" : e.target.value,
                  )
                }
              >
                <option value="newest">{t("Newest first")}</option>
                <option value="low">{t("Price: low to high")}</option>
                <option value="high">{t("Price: high to low")}</option>
                <option value="name-asc">{t("Name: A to Z")}</option>
                <option value="name-desc">{t("Name: Z to A")}</option>
                <option value="brand-asc">{t("Brand: A to Z")}</option>
              </select>
            </label>
          </div>
          <section
            id="product-filters"
            className="filters catalogue-filter-panel"
            aria-label={t("Product filters")}
            hidden={!showFilters}
          >
            <div className="filter-heading">
              <h2>{t("Filter products")}</h2>
              <div className="filter-panel-actions">
                {active && <button onClick={reset}>{t("Reset")}</button>}
                <button
                  className="icon-button"
                  aria-label={t("Close filters")}
                  onClick={() => {
                    setShowFilters(false);
                    filterButton.current?.focus();
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <CategoryNav />
            <label className="stock-filter">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) =>
                  updateParam("inStock", event.target.checked ? "1" : "")
                }
              />{" "}
              {t("In stock only")}
            </label>
            {category !== "accessory" && (
              <label>
                {t("Brand")}
                <select
                  aria-label={t("Brand")}
                  value={brand}
                  onChange={(e) => updateParam("brand", e.target.value)}
                >
                  <option value="">{t("All brands")}</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {t("Maximum price")}
              <select
                aria-label={t("Maximum price")}
                value={budget}
                onChange={(e) => updateParam("budget", e.target.value)}
              >
                <option value="">{t("Any price")}</option>
                {priceOptions.map((v) => (
                  <option value={v} key={v}>
                    {money(v)}
                  </option>
                ))}
              </select>
            </label>
            {category !== "accessory" && (
              <>
                <label>
                  {t("RAM")}
                  <select
                    aria-label={t("RAM")}
                    value={ram}
                    onChange={(e) => updateParam("ram", e.target.value)}
                  >
                    <option value="">{t("Any RAM")}</option>
                    {ramOptions.map((v) => (
                      <option value={v} key={v}>
                        {v} {t(" GB")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Storage")}
                  <select
                    aria-label={t("Storage")}
                    value={storage}
                    onChange={(e) => updateParam("storage", e.target.value)}
                  >
                    <option value="">{t("Any storage")}</option>
                    {storageOptions.map((v) => (
                      <option value={v} key={v}>
                        {v} {t(" GB")}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {category === "used" && (
              <label>
                {t("Condition")}
                <select
                  aria-label={t("Condition")}
                  value={condition}
                  onChange={(e) => updateParam("condition", e.target.value)}
                >
                  <option value="">{t("All conditions")}</option>
                  {conditionOptions.map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(category === "accessory" || !category) && (
              <label>
                {t("Accessory category")}
                <select
                  aria-label={t("Accessory category")}
                  value={accessory}
                  onChange={(e) => updateParam("accessory", e.target.value)}
                >
                  <option value="">{t("All categories")}</option>
                  {accessoryCategories.map((v) => (
                    <option key={v} value={v}>
                      {t(v)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="button dark filter-apply"
              onClick={() => {
                setShowFilters(false);
                filterButton.current?.focus();
              }}
            >
              {t("Show results · ")}
              {result.length}{" "}
              {result.length === 1 ? t("product") : t("products")}
            </button>
          </section>
          <div className="result-count">
            {result.length} {result.length === 1 ? t("product") : t("products")}{" "}
            {query && t("matching “{{query}}”", { query })}
            <span>{t("Shop pickup available")}</span>
            {active && (
              <button className="mobile-clear-filters" onClick={reset}>
                {t("Clear all ")}
                <X size={14} />
              </button>
            )}
          </div>
          {query &&
            referencePhones.some((p) =>
              p.name.toLowerCase().includes(query.toLowerCase()),
            ) && (
              <div className="reference-search-results">
                <strong>{t("Manufacturer specifications")}</strong>
                {referencePhones
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <Link
                      key={p.id}
                      to={"/compare?first=" + encodeURIComponent(p.id)}
                    >
                      {p.name} · {t("Compare")} ↗
                    </Link>
                  ))}
              </div>
            )}
          {active && (
            <div className="active-filters">
              <span>
                {[
                  query && `“${query}”`,
                  brand,
                  budget &&
                    t("Under {{price}}", { price: money(Number(budget)) }),
                  ram && `${ram} GB RAM`,
                  storage && t("{{count}} GB storage", { count: storage }),
                  t(condition),
                  t(accessory),
                  inStock && t("In stock"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button onClick={reset}>
                {t("Clear all ")}
                <X size={14} />
              </button>
            </div>
          )}
          {result.length ? (
            <div className="product-grid catalogue-grid">
              {result.map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h2>{t("No matches this time.")}</h2>
              <p>
                {t(
                  "Try another search or clear a filter to see more products.",
                )}
              </p>
              <button className="button dark" onClick={reset}>
                {t("Clear filters")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
