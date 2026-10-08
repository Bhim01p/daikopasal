import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useProducts } from "../context/ProductContext";
import { accessoryCategories } from "../data/categories";
import type { Category } from "../types";
import ProductCard from "../components/ProductCard";
import { money } from "../data/shop";
import { isSampleProduct } from "../utils/products";
export default function Catalogue({ category }: { category?: Category }) {
  const { products } = useProducts();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
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
  const result = useMemo(
    () =>
      base
        .filter(
          (p) =>
            (!query ||
              `${p.brand} ${p.name} ${p.accessoryCategory || ""}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!brand || p.brand === brand) &&
            (!budget || p.price <= Number(budget)) &&
            (!ram || p.ram === Number(ram)) &&
            (!storage || p.storage === Number(storage)) &&
            (!condition || p.condition === condition) &&
            (!accessory || p.accessoryCategory === accessory) &&
            (!inStock || p.available),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.price - b.price
            : sort === "high"
              ? b.price - a.price
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
          ? "Shop accessories"
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
      <h1 className="sr-only">{title}</h1>
      <div className="container catalogue-photo-banner">
        <img
          src={
            category === "accessory"
              ? "/assets/accessories-banner-v1.png"
              : "/assets/shop-banner-v1.png"
          }
          alt={
            category === "accessory"
              ? "Headphones, earbuds and charger"
              : "Phones and earbuds"
          }
        />
      </div>
      <div className="container catalogue-layout">
        <div className="catalogue-results">
          <div className="catalogue-controls">
            <div className="search-input">
              <Search size={17} />
              <label className="sr-only" htmlFor="catalogue-search">
                Search products
              </label>
              <input
                id="catalogue-search"
                value={query}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  e.target.value
                    ? next.set("q", e.target.value)
                    : next.delete("q");
                  setParams(next, { replace: true });
                }}
                placeholder="Search products or brands…"
              />
              {query && (
                <button
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.delete("q");
                    setParams(next, { replace: true });
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              ref={filterButton}
              aria-label="Filter"
              className="catalogue-filter-button button white"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="product-filters"
            >
              <SlidersHorizontal size={18} />
              Filter
              {filterCount > 0 && (
                <span className="filter-count">{filterCount}</span>
              )}
            </button>
            <label className="sort-label">
              <span className="sr-only">Sort products</span>
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>
          <section
            id="product-filters"
            className="filters catalogue-filter-panel"
            aria-label="Product filters"
            hidden={!showFilters}
          >
            <div className="filter-heading">
              <h2>Filter products</h2>
              <div className="filter-panel-actions">
                {active && <button onClick={reset}>Reset</button>}
                <button
                  className="icon-button"
                  aria-label="Close filters"
                  onClick={() => {
                    setShowFilters(false);
                    filterButton.current?.focus();
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <label className="stock-filter">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) => setInStock(event.target.checked)}
              />{" "}
              In stock only
            </label>
            {category !== "accessory" && (
              <label>
                Brand
                <select
                  aria-label="Brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                >
                  <option value="">All brands</option>
                  {brands.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Maximum price
              <select
                aria-label="Maximum price"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                <option value="">Any price</option>
                {(category === "accessory"
                  ? [500, 1000, 2000, 3500]
                  : [20000, 35000, 50000, 70000, 100000, 150000]
                ).map((v) => (
                  <option value={v} key={v}>
                    {money(v)}
                  </option>
                ))}
              </select>
            </label>
            {category !== "accessory" && (
              <>
                <label>
                  RAM
                  <select
                    aria-label="RAM"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                  >
                    <option value="">Any RAM</option>
                    {[...new Set(base.filter((p) => p.ram).map((p) => p.ram))]
                      .sort((a, b) => a! - b!)
                      .map((v) => (
                        <option value={v} key={v}>
                          {v} GB
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Storage
                  <select
                    aria-label="Storage"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                  >
                    <option value="">Any storage</option>
                    {[128, 256].map((v) => (
                      <option value={v} key={v}>
                        {v} GB
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {category === "used" && (
              <label>
                Condition
                <select
                  aria-label="Condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="">All conditions</option>
                  {["Like New", "Excellent", "Good", "Fair"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            {(category === "accessory" || !category) && (
              <label>
                Accessory category
                <select
                  aria-label="Accessory category"
                  value={accessory}
                  onChange={(e) => setAccessory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {accessoryCategories.map((v) => (
                    <option key={v}>{v}</option>
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
              Show {result.length}{" "}
              {result.length === 1 ? "product" : "products"}
            </button>
          </section>
          <div className="result-count">
            {result.length} {result.length === 1 ? "product" : "products"}{" "}
            {query && `matching “${query}”`}
            <span>
              {base.some(isSampleProduct)
                ? "Includes sample listings"
                : "Shop pickup available"}
            </span>
          </div>
          {active && (
            <div className="active-filters">
              <span>
                {[
                  query && `“${query}”`,
                  brand,
                  budget && `Under ${money(Number(budget))}`,
                  ram && `${ram} GB RAM`,
                  storage && `${storage} GB storage`,
                  condition,
                  accessory,
                  inStock && "In stock",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button onClick={reset}>
                Clear all <X size={14} />
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
              <h2>No matches this time.</h2>
              <p>Try another search or clear a filter to see more products.</p>
              <button className="button dark" onClick={reset}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
