import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Package,
  ShoppingBag,
  ArrowUpRight,
  LockKeyhole,
  Clock3,
  CheckCircle2,
  TriangleAlert,
  RefreshCw,
} from "lucide-react";
import { Brand } from "../components/Layout";
import { useProducts } from "../context/ProductContext";
import { api, ApiError } from "../utils/api";
import { accessoryCategories } from "../data/categories";
import { money } from "../data/shop";
import type { Product, Order, Category } from "../types";
import { productImages } from "../utils/products";
const statuses: Order["status"][] = [
  "Awaiting shop confirmation",
  "Confirmed",
  "Ready for pickup",
  "Completed",
  "Cancelled",
];
const maxPhotoMB = import.meta.env.VITE_HOSTED === "true" ? 4 : 5;
const freshProduct = (): Product => ({
  id: "",
  slug: "",
  name: "",
  brand: "",
  category: "new",
  price: 0,
  ram: 8,
  storage: 128,
  image: "/assets/phone.svg",
  color: "#c1d4d1",
  available: true,
  stockQuantity: 0,
  stockVersion: 0,
  isSample: false,
  description: "",
  specs: { Warranty: "Confirm with shop" },
  added: 0,
  condition: "Good",
  battery: 90,
  accessoryCategory: "Mobile Covers",
});
export default function Admin() {
  const { products, refresh } = useProducts();
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [draft, setDraft] = useState<Product>(freshProduct);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "low-stock">(
    "all",
  );
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "ready">(
    "all",
  );
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const pendingOrders = orders.filter((order) =>
    ["Awaiting shop confirmation", "Confirmed"].includes(order.status),
  );
  const readyOrders = orders.filter(
    (order) => order.status === "Ready for pickup",
  );
  const lowStock = products.filter(
    (product) =>
      product.isSample === false &&
      product.stockQuantity !== null &&
      product.stockQuantity <= 3,
  );
  const shownProducts = (
    productFilter === "low-stock" ? lowStock : products
  ).filter((product) =>
    `${product.brand} ${product.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const shownOrders =
    orderFilter === "pending"
      ? pendingOrders
      : orderFilter === "ready"
        ? readyOrders
        : orders;
  const [specsText, setSpecsText] = useState("Warranty: Confirm with shop");
  const [importProducts, setImportProducts] = useState<unknown[]>([]);
  const [inventoryPreview, setInventoryPreview] = useState<{
    products: Pick<Product, "name" | "brand" | "price" | "stockQuantity">[];
    sampleCount: number;
    preservedCount: number;
    catalogueVersion: string;
  } | null>(null);
  async function previewImport(file?: File) {
    setInventoryPreview(null);
    setImportProducts([]);
    setError("");
    if (!file) return;
    setBusy("import");
    try {
      if (file.size > 60000)
        throw new Error(
          "Keep each inventory file below 60 KB and 50 products.",
        );
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed))
        throw new Error(
          "Use a JSON array of product details, as shown in the template.",
        );
      const result = await api<NonNullable<typeof inventoryPreview>>(
        "/admin/catalogue/preview",
        { method: "POST", body: JSON.stringify({ products: parsed }) },
      );
      setImportProducts(parsed);
      setInventoryPreview(result);
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function importInventory() {
    if (!inventoryPreview) return;
    setBusy("import");
    setError("");
    setNotice("");
    try {
      const result = await api<{ imported: number; removedSamples: number }>(
        "/admin/catalogue/replace-samples",
        {
          method: "POST",
          body: JSON.stringify({
            products: importProducts,
            catalogueVersion: inventoryPreview.catalogueVersion,
          }),
        },
      );
      await refresh();
      setInventoryPreview(null);
      setImportProducts([]);
      resetDraft();
      setNotice(
        `Imported ${result.imported} real products and removed ${result.removedSamples} samples. A private backup was saved.`,
      );
    } catch (error) {
      fail(error);
      if (error instanceof ApiError && error.status === 409)
        setInventoryPreview(null);
    } finally {
      setBusy("");
    }
  }
  function resetDraft() {
    setDraft(freshProduct());
    setSpecsText("Warranty: Confirm with shop");
  }
  async function uploadPhotos(files?: FileList) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setError("");
    const currentPhotos = productImages(draft).filter(
      (image) => image !== draft.image || !image.endsWith(".svg"),
    );
    if (currentPhotos.length + selected.length > 6) {
      setError(
        "Keep up to six photos. Remove an existing photo before adding more.",
      );
      return;
    }
    if (
      selected.some(
        (file) =>
          file.size > maxPhotoMB * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type),
      )
    ) {
      setError(`Each photo must be JPG, PNG, or WebP and ${maxPhotoMB} MB or smaller.`);
      return;
    }
    setBusy("photo");
    let uploaded = 0;
    try {
      for (const file of selected) {
        const result = await api<{ image: string }>("/admin/images", {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type },
        });
        uploaded++;
        setDraft((current) => {
          const photos = productImages(current).filter(
            (image) => image !== current.image || !image.endsWith(".svg"),
          );
          const images = [...photos, result.image];
          return { ...current, image: images[0], images };
        });
      }
      setNotice(
        uploaded === 1
          ? "Photo uploaded. Save the product to use it in the shop."
          : `${uploaded} photos uploaded. Save the product to use them in the shop.`,
      );
    } catch (error) {
      fail(error);
      if (uploaded)
        setNotice(
          `${uploaded} photos uploaded before the error. You can save these or add the remaining photos again.`,
        );
    } finally {
      setBusy("");
    }
  }
  function fail(error: unknown) {
    setError(error instanceof Error ? error.message : "Please try again.");
    if (error instanceof ApiError && error.status === 401) setUser(null);
  }
  async function loadOrders() {
    const result = await api<{ orders: Order[]; emailConfigured: boolean }>(
      "/admin/orders",
    );
    setOrders(result.orders);
    setOrdersLoaded(true);
    setEmailConfigured(result.emailConfigured);
  }
  useEffect(() => {
    let active = true;
    api<{ user: { username: string } | null }>("/admin/session")
      .then((result) => {
        if (active) setUser(result.user?.username || null);
      })
      .catch((error) => {
        if (active) fail(error);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (user) void loadOrders().catch(fail);
  }, [user]);
  async function refreshOverview() {
    setBusy("overview");
    setError("");
    try {
      await Promise.all([loadOrders(), refresh()]);
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy("login");
    setError("");
    try {
      const result = await api<{ user: { username: string } }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(result.user.username);
      setPassword("");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function retryEmail(id: string) {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/emails/${encodeURIComponent(id)}/retry`, {
        method: "POST",
        body: "{}",
      });
      await loadOrders();
      setNotice(
        "Email queued for another attempt. Refresh orders to check its progress.",
      );
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function logout() {
    setBusy("logout");
    try {
      await api("/admin/logout", { method: "POST", body: "{}" });
      setUser(null);
      setOrders([]);
      setOrdersLoaded(false);
      setProductFilter("all");
      setOrderFilter("all");
      setInventoryPreview(null);
      setImportProducts([]);
      resetDraft();
      setNotice("");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy("save");
    try {
      const specs: Record<string, string> = {};
      for (const line of specsText.split("\n").filter((line) => line.trim())) {
        const split = line.indexOf(":");
        if (split < 1 || !line.slice(split + 1).trim())
          throw new Error("Enter each specification as Name: Value.");
        specs[line.slice(0, split).trim()] = line.slice(split + 1).trim();
      }
      await api(
        draft.id
          ? `/admin/products/${encodeURIComponent(draft.id)}`
          : "/admin/products",
        {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify({ ...draft, specs }),
        },
      );
      await refresh();
      resetDraft();
      setNotice("Product saved. The storefront catalogue has been updated.");
    } catch (error) {
      fail(error);
      if (error instanceof ApiError && error.status === 409)
        await refresh().catch(() => {});
    } finally {
      setBusy("");
    }
  }
  async function removeProduct(product: Product) {
    if (
      !window.confirm(
        `Remove ${product.name} from the catalogue? Existing order receipts will keep their details.`,
      )
    )
      return;
    setBusy(product.id);
    setError("");
    setNotice("");
    try {
      await api(`/admin/products/${encodeURIComponent(product.id)}`, {
        method: "DELETE",
      });
      await refresh();
      if (draft.id === product.id) resetDraft();
      setNotice("Product removed from the catalogue.");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function updateStatus(order: Order, status: Order["status"]) {
    setBusy(order.id);
    setError("");
    setNotice("");
    try {
      const result = await api<{ order: Order }>(
        `/admin/orders/${encodeURIComponent(order.id)}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setOrders((current) =>
        current.map((existing) =>
          existing.id === order.id ? result.order : existing,
        ),
      );
      await refresh();
      setNotice("Order status updated.");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  function selectProduct(product: Product) {
    setDraft({
      ...product,
      isSample: product.isSample !== false,
      specs: { ...product.specs },
    });
    setSpecsText(
      Object.entries(product.specs)
        .filter(([key]) => !["RAM", "Storage", "Category"].includes(key))
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n"),
    );
    setError("");
    setNotice("");
    document
      .getElementById("product-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (checking)
    return (
      <div className="container empty-state" role="status">
        <p>Checking admin access…</p>
      </div>
    );
  if (!user)
    return (
      <div className="admin-login-page">
        <Brand />
        <form className="admin-login" onSubmit={login}>
          <span className="tile-icon">
            <LockKeyhole size={24} />
          </span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage products and pickup orders.</p>
          <label htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={100}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={200}
            required
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button className="button dark full" disabled={busy === "login"}>
            {busy === "login" ? "Signing in…" : "Sign in"}
          </button>
          <Link className="text-link" to="/">
            Back to the shop <ArrowUpRight size={16} />
          </Link>
        </form>
      </div>
    );
  return (
    <div className="admin-root">
      <header className="admin-header container">
        <Brand />
        <div>
          <Link className="button white" to="/">
            View shop <ArrowUpRight size={16} />
          </Link>
          <button
            className="button white"
            onClick={() => void logout()}
            disabled={!!busy}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>
      <main className="container admin-shell">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">Shop admin</span>
            <h1>Keep your shop up to date.</h1>
            <p>Manage the catalogue and follow up on pickup orders.</p>
          </div>
          <div className="admin-counts">
            <span>
              <Package size={18} />
              {products.length} products
            </span>
            <span>
              <ShoppingBag size={18} />
              {orders.length} orders
            </span>
          </div>
        </div>
        <section className="admin-overview" aria-label="Shop overview">
          <div className="admin-overview-heading">
            <h2>At a glance</h2>
            <button
              className="button white"
              disabled={!!busy}
              onClick={() => void refreshOverview()}
            >
              <RefreshCw size={17} />
              {busy === "overview" ? "Refreshing…" : "Refresh overview"}
            </button>
          </div>
          <div className="admin-overview-cards">
            <button
              className="overview-card pending"
              aria-label={`Pending orders: ${ordersLoaded ? pendingOrders.length : "loading"}`}
              disabled={!!busy}
              onClick={() => {
                setTab("orders");
                setOrderFilter("pending");
              }}
            >
              <Clock3 size={23} />
              <strong>{ordersLoaded ? pendingOrders.length : "…"}</strong>
              <span>Pending orders</span>
              <small>Awaiting confirmation or confirmed</small>
            </button>
            <button
              className="overview-card ready"
              aria-label={`Ready for pickup: ${ordersLoaded ? readyOrders.length : "loading"}`}
              disabled={!!busy}
              onClick={() => {
                setTab("orders");
                setOrderFilter("ready");
              }}
            >
              <CheckCircle2 size={23} />
              <strong>{ordersLoaded ? readyOrders.length : "…"}</strong>
              <span>Ready for pickup</span>
              <small>Prepared for customers to collect</small>
            </button>
            <button
              className="overview-card stock"
              aria-label={`Low stock products: ${lowStock.length}`}
              disabled={!!busy}
              onClick={() => {
                setTab("products");
                setProductFilter("low-stock");
                setQuery("");
              }}
            >
              <TriangleAlert size={23} />
              <strong>{lowStock.length}</strong>
              <span>Low stock</span>
              <small>Real listings with 0–3 units left</small>
            </button>
          </div>
        </section>
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          <button
            role="tab"
            aria-selected={tab === "products"}
            aria-controls="admin-products"
            id="products-tab"
            className={tab === "products" ? "selected" : ""}
            onClick={() => {
              setTab("products");
              setError("");
              setNotice("");
            }}
          >
            <Package size={18} />
            Products
          </button>
          <button
            role="tab"
            aria-selected={tab === "orders"}
            aria-controls="admin-orders"
            id="orders-tab"
            className={tab === "orders" ? "selected" : ""}
            onClick={() => {
              setTab("orders");
              setError("");
              setNotice("");
              void loadOrders().catch(fail);
            }}
          >
            <ShoppingBag size={18} />
            Orders
          </button>
        </div>
        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="admin-notice" role="status">
            {notice}
          </div>
        )}
        {tab === "products" ? (
          <div
            id="admin-products"
            role="tabpanel"
            aria-labelledby="products-tab"
            className="admin-products-layout"
          >
            <section className="admin-panel">
              <div className="admin-panel-title">
                <h2>Your catalogue</h2>
                <button
                  className="button teal"
                  disabled={!!busy}
                  onClick={() => {
                    resetDraft();
                    document
                      .getElementById("product-editor")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Plus size={17} />
                  New product
                </button>
              </div>
              <label className="sr-only" htmlFor="admin-product-search">
                Search catalogue
              </label>
              <details className="admin-import">
                <summary>Replace sample listings</summary>
                <p>
                  Import verified shop details. Existing real listings and all
                  order receipts are kept. A private backup is saved before
                  samples are removed.
                </p>
                <a
                  className="text-link"
                  href="/inventory-template.json"
                  download
                >
                  Download inventory template
                </a>
                <label htmlFor="inventory-file">Inventory JSON file</label>
                <input
                  id="inventory-file"
                  type="file"
                  accept=".json,application/json"
                  disabled={!!busy}
                  onClick={(e) => {
                    e.currentTarget.value = "";
                  }}
                  onChange={(e) => void previewImport(e.target.files?.[0])}
                />
                {inventoryPreview && (
                  <div className="inventory-preview">
                    <h3>Review inventory</h3>
                    <p>
                      {inventoryPreview.products.length} real products to add ·{" "}
                      {inventoryPreview.sampleCount} samples to remove ·{" "}
                      {inventoryPreview.preservedCount} existing real listings
                      to keep.
                    </p>
                    <ul>
                      {inventoryPreview.products.map((product, index) => (
                        <li key={index}>
                          <strong>
                            {product.brand} {product.name}
                          </strong>
                          <span>
                            {money(product.price)} · {product.stockQuantity}{" "}
                            available
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Check prices and counts before importing. Placeholder
                      images stay labelled until you upload actual product
                      photos.
                    </p>
                    <button
                      className="button dark"
                      disabled={!!busy}
                      onClick={() => void importInventory()}
                    >
                      {busy === "import"
                        ? "Importing…"
                        : "Import real listings and remove samples"}
                    </button>
                  </div>
                )}
              </details>
              <input
                id="admin-product-search"
                className="admin-product-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or brands…"
              />
              <div className="admin-filter-bar" aria-label="Filter inventory">
                <button
                  aria-pressed={productFilter === "all"}
                  onClick={() => setProductFilter("all")}
                >
                  All products
                </button>
                <button
                  aria-pressed={productFilter === "low-stock"}
                  onClick={() => setProductFilter("low-stock")}
                >
                  Low stock
                </button>
              </div>
              {productFilter === "low-stock" && (
                <p className="admin-help">
                  Real listings with 0–3 units available. Sample products are
                  excluded.
                </p>
              )}
              <div className="admin-product-list">
                {shownProducts.map((p) => (
                  <article className="admin-product" key={p.id}>
                    <img src={p.image} alt="" />
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.brand} ·{" "}
                        {p.category === "used"
                          ? "Second-hand"
                          : p.category === "new"
                            ? "New mobile"
                            : p.accessoryCategory}
                      </span>
                      <b>{money(p.price)}</b>
                      <span
                        className={
                          p.available ? "admin-stock available" : "admin-stock"
                        }
                      >
                        {p.isSample !== false ? "Sample · " : ""}
                        {p.stockQuantity === null
                          ? "Set stock quantity"
                          : `${p.stockQuantity} available`}
                      </span>
                    </div>
                    <div className="admin-product-actions">
                      <button
                        className="icon-button"
                        disabled={!!busy}
                        onClick={() => selectProduct(p)}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        className="icon-button admin-remove"
                        disabled={!!busy}
                        onClick={() => void removeProduct(p)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!shownProducts.length && (
                <p className="admin-empty">
                  {productFilter === "low-stock" && !query
                    ? "No real products have 3 or fewer units available."
                    : "No products match this search."}
                </p>
              )}
            </section>
            <form
              className="admin-panel admin-editor"
              id="product-editor"
              onSubmit={saveProduct}
            >
              <h2>{draft.id ? "Edit product" : "Add a product"}</h2>
              <label htmlFor="product-name">Product name *</label>
              <input
                id="product-name"
                value={draft.name}
                maxLength={100}
                minLength={2}
                required
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
              <label htmlFor="product-brand">Brand *</label>
              <input
                id="product-brand"
                value={draft.brand}
                maxLength={60}
                required
                onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
              />
              <div className="admin-form-row">
                <div>
                  <label htmlFor="product-category">Category</label>
                  <select
                    id="product-category"
                    value={draft.category}
                    disabled={busy === "photo"}
                    onChange={(e) => {
                      const category = e.target.value as Category;
                      const image = draft.image.startsWith("/api/images/")
                        ? draft.image
                        : category === "accessory"
                          ? "/assets/cover.svg"
                          : "/assets/phone.svg";
                      setDraft({
                        ...draft,
                        category,
                        image,
                        images: [
                          image,
                          ...productImages(draft).filter(
                            (value) => value !== draft.image && value !== image,
                          ),
                        ],
                        ram: draft.ram || 8,
                        storage: draft.storage || 128,
                        condition: draft.condition || "Good",
                        battery: draft.battery ?? 90,
                        accessoryCategory:
                          draft.accessoryCategory || "Mobile Covers",
                      });
                    }}
                  >
                    <option value="new">New mobile</option>
                    <option value="used">Second-hand set</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="product-price">Price (NPR) *</label>
                  <input
                    id="product-price"
                    type="number"
                    min={0}
                    max={100000000}
                    step={1}
                    value={Number.isFinite(draft.price) ? draft.price : ""}
                    required
                    onChange={(e) =>
                      setDraft({ ...draft, price: e.target.valueAsNumber })
                    }
                  />
                </div>
              </div>
              {draft.category !== "accessory" ? (
                <div className="admin-form-row">
                  <div>
                    <label htmlFor="product-ram">RAM (GB)</label>
                    <input
                      id="product-ram"
                      type="number"
                      min={1}
                      max={64}
                      step={1}
                      value={draft.ram ?? ""}
                      required={draft.category === "new"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          ram: e.target.value
                            ? e.target.valueAsNumber
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="product-storage">Storage (GB) *</label>
                    <input
                      id="product-storage"
                      type="number"
                      min={16}
                      max={2048}
                      step={1}
                      value={draft.storage ?? ""}
                      required
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          storage: e.target.value
                            ? e.target.valueAsNumber
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label htmlFor="product-accessory-category">
                    Accessory category
                  </label>
                  <select
                    id="product-accessory-category"
                    value={draft.accessoryCategory || accessoryCategories[0]}
                    onChange={(e) =>
                      setDraft({ ...draft, accessoryCategory: e.target.value })
                    }
                  >
                    {accessoryCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </>
              )}
              {draft.category === "used" && (
                <div className="admin-form-row">
                  <div>
                    <label htmlFor="product-condition">Condition</label>
                    <select
                      id="product-condition"
                      value={draft.condition || "Good"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          condition: e.target.value as Product["condition"],
                        })
                      }
                    >
                      {["Like New", "Excellent", "Good", "Fair"].map(
                        (condition) => (
                          <option key={condition}>{condition}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="product-battery">
                      Battery health (%) *
                    </label>
                    <input
                      id="product-battery"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={draft.battery ?? ""}
                      required
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          battery: e.target.value
                            ? e.target.valueAsNumber
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <label htmlFor="product-image">Illustration</label>
              <select
                id="product-image"
                disabled={busy === "photo"}
                value={draft.image}
                onChange={(e) => {
                  const image = e.target.value;
                  setDraft({
                    ...draft,
                    image,
                    images: [
                      image,
                      ...productImages(draft).filter(
                        (value) => value !== draft.image && value !== image,
                      ),
                    ],
                  });
                }}
              >
                {draft.image.startsWith("/api/images/") && (
                  <option value={draft.image}>Uploaded product photo</option>
                )}
                {[
                  ["phone", "Phone"],
                  ["cover", "Cover / protector"],
                  ["charger", "Charger"],
                  ["earbuds", "Earbuds / earphones"],
                  ["speaker", "Speaker"],
                  ["bulb", "Bulb"],
                ].map(([key, label]) => (
                  <option key={key} value={`/assets/${key}.svg`}>
                    {label}
                  </option>
                ))}
              </select>
              <label htmlFor="product-photo">Product photo</label>
              <input
                id="product-photo"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={!!busy}
                onChange={(e) => {
                  void uploadPhotos(e.target.files || undefined);
                  e.target.value = "";
                }}
              />
              <span className="admin-help">
                Add up to six photos. JPG, PNG, or WebP · up to 5 MB each.
                Choose the cover photo below.
              </span>
              <div className="admin-photo-grid">
                {productImages(draft).map((image, index, photos) => (
                  <div className="admin-photo-tile" key={image}>
                    <img
                      src={image}
                      alt={`Product photo ${index + 1} preview`}
                    />
                    <strong>
                      {index === 0 ? "Cover photo" : `Photo ${index + 1}`}
                    </strong>
                    <button
                      type="button"
                      disabled={!!busy || index === 0}
                      aria-label={`Make photo ${index + 1} cover`}
                      onClick={() => {
                        const images = [
                          image,
                          ...photos.filter((value) => value !== image),
                        ];
                        setDraft({ ...draft, image, images });
                      }}
                    >
                      Use as cover
                    </button>
                    <button
                      type="button"
                      disabled={!!busy || photos.length === 1}
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => {
                        const images = photos.filter(
                          (value) => value !== image,
                        );
                        setDraft({ ...draft, image: images[0], images });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <label htmlFor="product-description">Description *</label>
              <textarea
                id="product-description"
                rows={4}
                value={draft.description}
                maxLength={2000}
                required
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
              <label htmlFor="product-specs">Additional specifications</label>
              <textarea
                id="product-specs"
                rows={3}
                placeholder={"Display: 6.5 inch\nColour: Black"}
                value={specsText}
                onChange={(e) => setSpecsText(e.target.value)}
              />
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={draft.isSample !== false}
                  onChange={(e) =>
                    setDraft({ ...draft, isSample: e.target.checked })
                  }
                />
                <span>Sample listing (example price and stock)</span>
              </label>
              <label htmlFor="product-stock">Stock quantity *</label>
              <input
                id="product-stock"
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={
                  draft.stockQuantity !== null &&
                  Number.isFinite(draft.stockQuantity)
                    ? draft.stockQuantity
                    : ""
                }
                required
                onChange={(e) =>
                  setDraft({ ...draft, stockQuantity: e.target.valueAsNumber })
                }
              />
              <p className="summary-note">
                Enter units available for new orders. Existing orders already
                reserve their units. Set 0 for out of stock.
              </p>
              <div className="button-row">
                <button className="button dark" type="submit" disabled={!!busy}>
                  {busy === "save" ? "Saving…" : "Save product"}
                </button>
                {draft.id && (
                  <button
                    className="button white"
                    type="button"
                    disabled={!!busy}
                    onClick={resetDraft}
                  >
                    Cancel editing
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <section
            id="admin-orders"
            role="tabpanel"
            aria-labelledby="orders-tab"
            className="admin-panel"
          >
            <div className="admin-panel-title">
              <h2>Pickup orders</h2>
              <button
                className="button white"
                onClick={() => void loadOrders().catch(fail)}
              >
                Refresh orders
              </button>
            </div>
            <div className="admin-filter-bar" aria-label="Filter pickup orders">
              {(
                [
                  ["all", "All orders"],
                  ["pending", "Pending"],
                  ["ready", "Ready for pickup"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={orderFilter === value}
                  onClick={() => setOrderFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {!ordersLoaded ? (
              <p className="admin-empty" role="status">
                Loading pickup orders…
              </p>
            ) : !shownOrders.length ? (
              <div className="admin-empty">
                <ShoppingBag size={35} />
                <h3>
                  {orderFilter === "all"
                    ? "No pickup orders yet."
                    : orderFilter === "pending"
                      ? "No pending orders."
                      : "No orders ready for pickup."}
                </h3>
                <p>
                  {orderFilter === "all"
                    ? "Orders created on the storefront will appear here."
                    : "Choose All orders to see your other orders."}
                </p>
              </div>
            ) : (
              <div className="admin-orders">
                {!emailConfigured && (
                  <p className="admin-email-note" role="status">
                    Email sending is not configured yet. Messages are saved in
                    the queue and will send once the email service is connected.
                  </p>
                )}
                {shownOrders.map((order) => (
                  <article className="admin-order" key={order.id}>
                    <div className="admin-order-top">
                      <div>
                        <strong>{order.id}</strong>
                        <span>
                          {new Date(order.date).toLocaleString("en-GB", {
                            timeZone: "Asia/Kathmandu",
                          })}
                        </span>
                      </div>
                      <strong>{money(order.total)}</strong>
                    </div>
                    <div className="admin-order-customer">
                      <strong>{order.name}</strong>
                      <a href={`tel:${order.phone}`}>{order.phone}</a>
                      {order.email && (
                        <a href={`mailto:${order.email}`}>{order.email}</a>
                      )}
                      <span>Shop pickup</span>
                    </div>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.product.id}>
                          <span>
                            {item.product.name} × {item.quantity}
                          </span>
                          <b>{money(item.product.price * item.quantity)}</b>
                        </li>
                      ))}
                    </ul>
                    {order.note && (
                      <p className="admin-order-note">Note: {order.note}</p>
                    )}
                    <label htmlFor={`status-${order.id}`}>Order status</label>
                    <select
                      id={`status-${order.id}`}
                      aria-label={`Status for ${order.id}`}
                      value={order.status}
                      disabled={
                        !!busy ||
                        order.status === "Cancelled" ||
                        order.status === "Completed"
                      }
                      onChange={(e) =>
                        void updateStatus(
                          order,
                          e.target.value as Order["status"],
                        )
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    {order.status === "Cancelled" && (
                      <p className="summary-note">
                        Order closed. New orders return reserved units to stock
                        on cancellation.
                      </p>
                    )}
                    {order.status === "Completed" && (
                      <p className="summary-note">
                        Order closed. Pickup is complete.
                      </p>
                    )}
                    <div className="admin-email-updates">
                      <strong>Email updates</strong>
                      {!order.email ? (
                        <p>This older order has no email address.</p>
                      ) : (
                        <ul>
                          {order.emailNotifications?.map((email) => (
                            <li key={email.id}>
                              <div>
                                <span>
                                  {email.kind === "received"
                                    ? "Order received"
                                    : email.orderStatus}
                                </span>
                                <small>
                                  {email.state === "accepted"
                                    ? "Accepted by email service"
                                    : email.state === "failed"
                                      ? "Needs attention"
                                      : "Queued"}
                                </small>
                                {email.state === "failed" && (
                                  <p>{email.error}</p>
                                )}
                              </div>
                              {email.state === "failed" && emailConfigured && (
                                <button
                                  className="button white"
                                  disabled={!!busy}
                                  onClick={() => void retryEmail(email.id)}
                                >
                                  Retry email
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
