import { currentLanguage, useT } from "../context/LanguageContext";
import { normalizeDigits } from "../../../shared/locale.mjs";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  LayoutDashboard,
  Users,
  ReceiptText,
  Wrench,
} from "lucide-react";
type AdminTab = "dashboard" | "products" | "catalogue" | "orders" | "staff" | "billing" | "qr" | "repairs" | "sales";
const adminSections = [
  {
    value: "dashboard",
    label: "Dashboard",
    Icon: LayoutDashboard,
    panel: "admin-dashboard",
    id: "dashboard-tab",
  },
  {
    value: "orders",
    label: "Orders",
    Icon: ShoppingBag,
    panel: "admin-orders",
    id: "orders-tab",
  },
  { value: "billing", label: "Billing", Icon: ReceiptText, panel: "admin-billing", id: "billing-tab" },
  { value: "qr", label: "Payment QR", Icon: ReceiptText, panel: "admin-payment-qr", id: "payment-qr-tab" },
  { value: "sales", label: "Sales", Icon: ReceiptText, panel: "admin-sales", id: "sales-tab" },
  { value: "repairs", label: "Repair tickets", Icon: Wrench, panel: "admin-repairs", id: "repairs-tab" },
  {
    value: "products",
    category: "new",
    label: "New phones",
    Icon: Package,
    panel: "admin-products",
    id: "products-new-tab",
  },
  {
    value: "products",
    category: "used",
    label: "Used phones",
    Icon: Package,
    panel: "admin-products",
    id: "products-used-tab",
  },
  {
    value: "products",
    category: "accessory",
    label: "Accessories",
    Icon: Package,
    panel: "admin-products",
    id: "products-accessory-tab",
  },
  {
    value: "staff",
    label: "Staff logins",
    Icon: Users,
    panel: "admin-staff",
    id: "staff-tab",
  },
] as const;
import ProductFinanceEditor from "../components/ProductFinanceEditor";
import StaffManager from "../components/StaffManager";
import { ThemeSwitch } from "../context/ThemeContext";
import QuickStock from "../components/QuickStock";
import OrderCloseDialog from "../components/OrderCloseDialog";
import { LanguageSwitch, translateCurrent } from "../context/LanguageContext";
import { Brand } from "../components/Layout";
import { useProducts } from "../context/ProductContext";
import { api, ApiError } from "../utils/api";
import { accessoryCategories } from "../data/categories";
import { money } from "../data/shop";
import type { Product, Order, Category } from "../types";
import { productImages } from "../utils/products";
import SafeImage from "../components/SafeImage";
import AdminBilling from "../components/AdminBilling";
import AdminPaymentQr from "../components/AdminPaymentQr";
import AdminRepairs from "../components/AdminRepairs";
import AdminPhoneCatalogue from "../components/AdminPhoneCatalogue";
const nextActions = {
  "Awaiting shop confirmation": ["Confirmed", "Confirm order"],
  Confirmed: ["Ready for pickup", "Ready for pickup"],
  "Ready for pickup": ["Completed", "Complete pickup"],
} as const;
type StoreSale = {
  id: string;
  date: string;
  total: number;
  customerName: string;
  paymentMethod: string;
};
type CataloguePhone = {
  deviceId: string;
  brand: string;
  model: string;
  variant: string;
  ram?: number;
  storage?: number;
  specs: Record<string, string>;
  sourceUrl: string;
  catalogueImage?: string;
  catalogueImageCount?: number;
};
const initialSpecs = [{ name: "Warranty", value: "Confirm with shop" }];
const draftKey = (draft: Product, specs: { name: string; value: string }[]) =>
  JSON.stringify([draft, specs]);
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
  accessoryCategory: "Mobile Covers",
});
export default function Admin() {
  const t = useT();
  const { products, refresh } = useProducts();
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [permissions, setPermissions] = useState<{ orders?: boolean; sales?: boolean; billing?: boolean; inventory?: boolean; repairs?: boolean; paymentQr?: boolean }>({});
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const parts = location.pathname
    .replace(/^\/not-admin\/?/, "")
    .split("/")
    .filter(Boolean);
  const categoryRoutes: Partial<Record<string, Category>> = {
    "new-phones": "new",
    "used-phones": "used",
    accessories: "accessory",
  };
  const categoryPaths = {
    new: "new-phones",
    used: "used-phones",
    accessory: "accessories",
  };
  const inventoryCategory: "all" | Category = categoryRoutes[parts[0]] || "all";
  const tab: AdminTab =
    parts[0] === "orders"
      ? "orders"
      : parts[0] === "billing"
        ? "billing"
      : (parts[0] === "payment-qr" || parts[0] === "qr")
        ? "qr"
        : parts[0] === "repairs"
          ? "repairs"
      : parts[0] === "sales"
        ? "sales"
      : parts[0] === "staff"
        ? "staff"
      : parts[0] === "phone-catalogue"
        ? "catalogue"
        : inventoryCategory !== "all" || parts[0] === "inventory"
          ? "products"
          : "dashboard";
  const listPath =
    inventoryCategory === "all"
      ? "/not-admin/inventory"
      : `/not-admin/${categoryPaths[inventoryCategory]}`;
  function setTab(value: AdminTab) {
    navigate(
      value === "dashboard"
        ? "/not-admin"
        : value === "products"
          ? "/not-admin/inventory"
          : `/not-admin/${value === "qr" ? "payment-qr" : value === "catalogue" ? "phone-catalogue" : value}`,
    );
  }
  function setInventoryCategory(value: "all" | Category) {
    navigate(
      value === "all"
        ? "/not-admin/inventory"
        : `/not-admin/${categoryPaths[value]}`,
    );
  }
  const productEditorOpen = tab === "products" && !!parts[1];
  function setProductEditorOpen(open: boolean) {
    if (open) navigate(listPath + "/create");
    else if (productEditorOpen) navigate(listPath);
  }
  const selectedOrderId = tab === "orders" ? parts[1] || null : null;
  function setSelectedOrderId(id: string | null) {
    navigate(
      id ? `/not-admin/orders/${encodeURIComponent(id)}` : "/not-admin/orders",
    );
  }
  const previousPath = useRef(location.pathname);
  const restoringPath = useRef(false);
  const [draft, setDraft] = useState<Product>(freshProduct);
  const [cataloguePhones, setCataloguePhones] = useState<CataloguePhone[]>([]);
  const [catalogueBrand, setCatalogueBrand] = useState("");
  const [catalogueModel, setCatalogueModel] = useState("");
  const [catalogueVariant, setCatalogueVariant] = useState("");
  const [catalogueMode, setCatalogueMode] = useState<"catalogue" | "manual">("catalogue");
  const [catalogueFilled, setCatalogueFilled] = useState(false);
  const [catalogueImageFilter, setCatalogueImageFilter] = useState<"all" | 3 | 2 | 1 | 0>("all");
  const [catalogueSearch, setCatalogueSearch] = useState("");
  const [catalogueAdvancedOpen, setCatalogueAdvancedOpen] = useState(false);
  const [cataloguePickerOpen, setCataloguePickerOpen] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [salesRange, setSalesRange] = useState<"today" | "7days" | "month" | "all">("today");
  useEffect(() => {
    if (productEditorOpen)
      document.getElementById("product-editor-title")?.focus();
  }, [productEditorOpen]);
  useEffect(() => {
    if (!user || !productEditorOpen || !(draft.category === "new" || draft.category === "used") || cataloguePhones.length) return;
    void api<{ phones: CataloguePhone[] }>("/admin/phone-catalogue")
      .then((result) => setCataloguePhones(result.phones))
      .catch(fail);
  }, [user, productEditorOpen, draft.category, cataloguePhones.length]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeSales, setStoreSales] = useState<StoreSale[]>([]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  useEffect(() => {
    if (selectedOrderId) document.getElementById("back-to-orders")?.focus();
  }, [selectedOrderId]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [closingOrder, setClosingOrder] = useState<{
    order: Order;
    status: "Completed" | "Cancelled";
  } | null>(null);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<"all" | "low-stock" | "review">(
    "all",
  );
  const [orderFilter, setOrderFilter] = useState<
    | "all"
    | "pending"
    | "confirmed"
    | "ready"
    | "completed"
    | "cancelled"
    | "attention"
  >("all");
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const pendingOrders = orders.filter(
    (order) => order.status === "Awaiting shop confirmation",
  );
  const readyOrders = orders.filter(
    (order) => order.status === "Ready for pickup",
  );
  const salesOrders = orders.filter((order) => {
    if (!["Completed", "Delivered"].includes(order.status)) return false;
    if (salesRange === "all") return true;
    const date = new Date(order.handover?.date || order.date);
    const now = new Date();
    if (salesRange === "today") return date.toDateString() === now.toDateString();
    if (salesRange === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    return now.getTime() - date.getTime() <= 7 * 86400000;
  });
  const filteredSalesTotal = salesOrders.reduce((sum, order) => sum + order.total, 0);
  const lowStock = products.filter(
    (product) =>
      product.isSample === false &&
      product.stockQuantity !== null &&
      product.stockQuantity <= 3,
  );
  const needsReview = products.filter((product) => !product.reviewedAt || Date.now() - Date.parse(product.reviewedAt) > 30 * 86400000);
  const shownProducts = (
    productFilter === "low-stock" ? lowStock : productFilter === "review" ? needsReview : products
  ).filter(
    (product) =>
      (inventoryCategory === "all" || product.category === inventoryCategory) &&
      `${product.brand} ${product.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const notificationFailures = orders.filter((order) =>
    order.emailNotifications?.some((email) => email.state === "failed"),
  );
  const shownOrders = orders.filter((order) => {
    const statusMatches =
      orderFilter === "all" ||
      (orderFilter === "attention"
        ? notificationFailures.includes(order)
        : order.status ===
          {
            pending: "Awaiting shop confirmation",
            confirmed: "Confirmed",
            ready: "Ready for pickup",
            completed: "Completed",
            cancelled: "Cancelled",
          }[orderFilter]);
    const queryMatches = `${order.id} ${order.name} ${order.phone}`
      .toLowerCase()
      .includes(normalizeDigits(orderQuery).toLowerCase().trim());
    const dateMatches =
      !dateFilter ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kathmandu",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(order.date)) === dateFilter;
    return statusMatches && queryMatches && dateMatches;
  });
  const [specRows, setSpecRows] = useState(initialSpecs);
  const [baseline, setBaseline] = useState(() =>
    draftKey(freshProduct(), initialSpecs),
  );
  const dirty = draftKey(draft, specRows) !== baseline;
  function mayDiscard() {
    return (
      !dirty ||
      window.confirm(translateCurrent("You have unsaved product changes. Leave without saving?"))
    );
  }
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest("a[href]");
      if (
        link &&
        !link.hasAttribute("download") &&
        !link.hasAttribute("target") &&
        !mayDiscard()
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onLink, true);
    };
  }, [dirty]);
  useLayoutEffect(() => {
    if (restoringPath.current && previousPath.current === location.pathname) {
      restoringPath.current = false;
      return;
    }
    if (
      previousPath.current !== location.pathname &&
      dirty &&
      !window.confirm(t("You have unsaved product changes. Leave without saving?"))
    ) {
      restoringPath.current = true;
      navigate(previousPath.current, { replace: true });
      return;
    }
    previousPath.current = location.pathname;
    if (!productEditorOpen) {
      const next = freshProduct();
      setDraft(next);
      setSpecRows(initialSpecs);
      setBaseline(draftKey(next, initialSpecs));
      return;
    }
    const product =
      parts[1] === "create"
        ? null
        : products.find((item) => item.id === parts[1]);
    if (parts[1] !== "create" && !product) {
      setError("Product not found.");
      navigate(listPath, { replace: true });
      return;
    }
    const next = product
      ? { ...product, images: product.images?.length ? [...product.images] : [product.image], specs: { ...product.specs } }
      : {
          ...freshProduct(),
          category:
            inventoryCategory === "all"
              ? ("new" as Category)
              : inventoryCategory,
          image:
            inventoryCategory === "accessory"
              ? "/assets/cover.svg"
              : "/assets/phone.svg",
        };
    const rows = product
      ? Object.entries(product.specs)
          .filter(([key]) => !["RAM", "Storage", "Category"].includes(key))
          .map(([name, value]) => ({ name, value }))
      : initialSpecs;
    setDraft(next);
    setSpecRows(rows);
    setBaseline(draftKey(next, rows));
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (user && role !== "owner" && tab === "staff")
      navigate("/not-admin", { replace: true });
  }, [user, role, tab]);
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
    if (!inventoryPreview || !mayDiscard()) return;
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
      await refresh(true);
      setInventoryPreview(null);
      setImportProducts([]);
      resetDraft(true);
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
  function resetDraft(force = false) {
    if (!force && !mayDiscard()) return;
    const next = freshProduct();
    setBaseline(draftKey(next, initialSpecs));
    setProductEditorOpen(false);
    setDraft(next);
    setCatalogueBrand(""); setCatalogueModel(""); setCatalogueVariant("");
    setCatalogueMode("catalogue"); setCatalogueFilled(false);
    setCatalogueImageFilter("all");
    setCatalogueSearch("");
    setCatalogueAdvancedOpen(false);
    setCataloguePickerOpen(false);
    setSpecRows(initialSpecs);
    setBaseline(draftKey(next, initialSpecs));
  }
  const catalogueDeviceRows = Array.from(new Map(cataloguePhones.map((phone) => [phone.deviceId, phone])).values());
  const imageCountMatches = (phone: CataloguePhone) => catalogueImageFilter === "all" || (catalogueImageFilter === 3 ? (phone.catalogueImageCount || 0) >= 3 : (phone.catalogueImageCount || 0) === catalogueImageFilter);
  const catalogueCards = catalogueDeviceRows.filter((phone) => imageCountMatches(phone) && `${phone.brand} ${phone.model}`.toLowerCase().includes(catalogueSearch.toLowerCase()));
  const catalogueModels = cataloguePhones.filter((phone) => phone.brand === catalogueBrand && imageCountMatches(phone));
  const catalogueVariants = catalogueModels.filter((phone) => phone.model === catalogueModel);
  const uniqueCatalogueVariants = Array.from(new Map(catalogueVariants.map((phone) => [phone.variant, phone])).values());
  function fillFromCatalogue() {
    const selected = uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant);
    if (!selected) return;
    const rows = Object.entries(selected.specs)
      .filter(([name]) => name !== "RAM" && name !== "Storage")
      .map(([name, value]) => ({ name, value }));
    setDraft((current) => ({
      ...current,
      brand: selected.brand,
      name: selected.model,
      ram: selected.ram,
      storage: selected.storage,
      image: "/assets/phone.svg",
      images: ["/assets/phone.svg"],
      description: current.description || `${selected.brand} ${selected.model} · ${selected.variant}`,
    }));
    setSpecRows([{ name: "Warranty", value: "Confirm with shop" }, ...rows]);
    setCatalogueFilled(true);
    setNotice("Catalogue details filled. Review the product before saving.");
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
      setError(
        `Each photo must be JPG, PNG, or WebP and ${maxPhotoMB} MB or smaller.`,
      );
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
    const result = await api<{
      orders: Order[];
      emailConfigured: boolean;
      smsMode: string;
    }>("/admin/orders");
    setOrders(result.orders);
    const sales = await api<{ sales: StoreSale[] }>("/admin/sales");
    setStoreSales(sales.sales.filter((sale) => sale.id.startsWith("SALE-")));
    setOrdersLoaded(true);
    setEmailConfigured(result.emailConfigured);
  }
  useEffect(() => {
    let active = true;
    api<{ user: { username: string; role: "owner" | "staff"; permissions?: typeof permissions } | null }>(
      "/admin/session",
    )
      .then((result) => {
        if (active) {
          setUser(result.user?.username || null);
          setRole(result.user?.role || "staff");
          setPermissions(result.user?.permissions || {});
        }
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
      const result = await api<{
        user: { username: string; role: "owner" | "staff"; permissions?: typeof permissions };
      }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(result.user.username);
      setRole(result.user.role);
      setPermissions(result.user.permissions || {});
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
    if (!mayDiscard()) return;
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
      resetDraft(true);
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
      const selectedCatalogue = uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant);
      const catalogueDraft = selectedCatalogue && catalogueMode === "catalogue"
        ? { ...draft, brand: selectedCatalogue.brand, name: selectedCatalogue.model, ram: selectedCatalogue.ram ?? (Number.isFinite(Number(selectedCatalogue.variant.match(/(\d+)\s*GB/)?.[1])) ? Number(selectedCatalogue.variant.match(/(\d+)\s*GB/)?.[1]) : undefined), storage: selectedCatalogue.storage ?? (Number.isFinite(Number(selectedCatalogue.variant.match(/\/\s*(\d+)\s*GB/)?.[1])) ? Number(selectedCatalogue.variant.match(/\/\s*(\d+)\s*GB/)?.[1]) : undefined), catalogueDeviceId: selectedCatalogue.deviceId }
        : draft;
      if (catalogueDraft.category === "used") {
        if (!catalogueDraft.condition) throw new Error("Select a condition grade for this used phone.");
        if (catalogueDraft.battery === undefined || !Number.isInteger(catalogueDraft.battery) || catalogueDraft.battery < 0 || catalogueDraft.battery > 100)
          throw new Error("Enter battery health from 0 to 100 for this used phone.");
        if (!productImages(catalogueDraft).some((image) => image.startsWith("/api/images/upload-")))
          throw new Error("Upload at least one actual device photo for this used phone.");
        if ((catalogueDraft.stockQuantity || 0) > 1 && !window.confirm(t("Use stock above 1 only when the used phones are genuinely interchangeable in condition, battery, photos, accessories, defects, and price."))) return;
      }
      const specs: Record<string, string> = {};
      for (const row of specRows) {
        if (!row.name.trim() && !row.value.trim()) continue;
        if (!row.name.trim() || !row.value.trim())
          throw new Error("Enter a name and value for each specification.");
        if (specs[row.name.trim()])
          throw new Error("Use different names for each specification.");
        specs[row.name.trim()] = row.value.trim();
      }
      await api(
        draft.id
          ? `/admin/products/${encodeURIComponent(draft.id)}`
          : "/admin/products",
        {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify({ ...catalogueDraft, specs }),
        },
      );
      await refresh(true);
      resetDraft(true);
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
        t(
          "Remove {{name}} from the catalogue? Existing order receipts will keep their details.",
          { name: product.name },
        ),
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
      if (draft.id === product.id) resetDraft(true);
      setNotice("Product removed from the catalogue.");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function updateStatus(order: Order, status: Order["status"], pickupReference?: string) {
    setBusy(order.id);
    setError("");
    setNotice("");
    try {
      const result = await api<{ order: Order }>(
        `/admin/orders/${encodeURIComponent(order.id)}`,
        { method: "PATCH", body: JSON.stringify({ status, pickupReference }) },
      );
      setOrders((current) =>
        current.map((existing) =>
          existing.id === order.id ? result.order : existing,
        ),
      );
      await refresh();
      setNotice("Order status updated.");
      return true;
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  async function reviewPayment(order: Order, status: "PAID" | "REJECTED") {
    setBusy(`payment-${order.id}`); setError("");
    try {
      const result = await api<{ order: Order }>(`/admin/orders/${encodeURIComponent(order.id)}/payment`, { method: "PATCH", body: JSON.stringify({ status }) });
      setOrders((current) => current.map((item) => item.id === order.id ? result.order : item));
      setNotice(status === "PAID" ? "Payment verified." : "Payment rejected.");
    } catch (error) { fail(error); } finally { setBusy(""); }
  }
  async function printOrderBill(order: Order) {
    setBusy(`bill-${order.id}`);
    setError("");
    try {
      let billId: string | undefined;
      if (order.billIssued) {
        const bills = await api<{ bills: { id: string; orderId: string | null }[] }>("/admin/bills");
        billId = bills.bills.find((bill) => bill.orderId === order.id)?.id;
      } else {
        const result = await api<{ bill: { id: string } }>("/admin/bills", {
          method: "POST",
          body: JSON.stringify({ orderId: order.id }),
        });
        billId = result.bill.id;
        await loadOrders();
      }
      if (!billId) throw new Error("Bill not found for this order.");
      window.open(`/api/admin/bills/${encodeURIComponent(billId)}/pdf`, "_blank", "noopener,noreferrer");
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  }
  function selectProduct(product: Product) {
    if (!mayDiscard()) return;
    navigate(listPath + "/" + encodeURIComponent(product.id));
    setError("");
    setNotice("");
  }
  if (checking)
    return (
      <div className="container empty-state" role="status">
        <p>{t("Checking admin access…")}</p>
      </div>
    );
  if (!user)
    return (
      <div className="admin-login-page">
        <LanguageSwitch />
        <div className="admin-login-theme">
          <ThemeSwitch />
        </div>
        <Brand />
        <form className="admin-login" onSubmit={login}>
          <span className="tile-icon">
            <LockKeyhole size={24} />
          </span>
          <h1>{t("Welcome back.")}</h1>
          <p>{t("Sign in to manage products and pickup orders.")}</p>
          <label htmlFor="admin-username">{t("Username")}</label>
          <input
            id="admin-username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={100}
            required
          />
          <label htmlFor="admin-password">{t("Password")}</label>
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
              {t(error)}
            </p>
          )}
          <button className="button dark full" disabled={busy === "login"}>
            {busy === "login" ? t("Signing in…") : t("Sign in")}
          </button>
          <Link className="text-link" to="/">
            {t("Back to the shop ")}
            <ArrowUpRight size={16} />
          </Link>
        </form>
      </div>
    );
  return (
    <div className="admin-root">
      <header className="admin-header container">
        <Brand />
        <div>
          <LanguageSwitch />
          <ThemeSwitch />
          <Link className="button white" to="/">
            {t("View shop ")}
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="button white"
            onClick={() => void logout()}
            disabled={!!busy}
          >
            <LogOut size={16} />
            {t("Sign out")}
          </button>
        </div>
      </header>
      <main className="container admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-identity">
            <strong>{user}</strong>
            <span>{t(role === "owner" ? "Main admin" : "Staff")}</span>
          </div>
          <div
            className="admin-side-menu"
            role="tablist"
            aria-label={t("Admin sections")}
            aria-orientation="vertical"
          >
            {adminSections
              .filter(
                (section) => {
                  if (role === "owner") return true;
                  if (section.value === "staff") return false;
                  if (section.value === "qr") return !!permissions.paymentQr;
                  const permission = section.value === "products" ? "inventory" : section.value;
                  return permissions[permission as keyof typeof permissions] !== false;
                },
              )
              .map((section) => {
                const { value, label, Icon, panel, id } = section;
                const category =
                  "category" in section ? section.category : undefined;
                const selected =
                  tab === value &&
                  (!category || inventoryCategory === category);
                return (
                  <button
                    key={id}
                    role="tab"
                    id={id}
                    aria-controls={panel}
                    aria-selected={selected}
                    className={selected ? "selected" : ""}
                    onClick={() => {
                      if (!mayDiscard()) return;
                      if (dirty) resetDraft(true);
                      if (category) setInventoryCategory(category);
                      else setTab(value);
                      setError("");
                      setNotice("");
                      if (value === "orders") void loadOrders().catch(fail);
                    }}
                  >
                    <Icon size={18} /> {t(label)}
                  </button>
                );
              })}
          </div>
        </aside>
        <div className="admin-shell">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">{t("Shop admin")}</span>
              <h1>
                {t(
                  {
                    dashboard: "Dashboard",
                    products:
                      inventoryCategory === "new"
                        ? "New phones"
                        : inventoryCategory === "used"
                          ? "Used phones"
                          : inventoryCategory === "accessory"
                            ? "Accessories"
                            : "Inventory",
                    orders: "Orders",
                    billing: "Billing",
                    qr: "Payment QR",
                    sales: "Sales",
                    repairs: "Repair tickets",
                    staff: "Staff logins",
                    catalogue: "Phone Catalogue",
                  }[tab],
                )}
              </h1>
              <p>
                {tab === "dashboard"
                  ? t("Welcome, {{username}}.", { username: user })
                  : t("Manage the catalogue and follow up on pickup orders.")}
              </p>
            </div>
            <div className="admin-counts">
              <span>
                <Package size={18} />
                {products.length} {t(" products")}
              </span>
              <span>
                <ShoppingBag size={18} />
                {orders.length} {t(" orders")}
              </span>
            </div>
          </div>
          {tab === "dashboard" && (
            <div
              id="admin-dashboard"
              role="tabpanel"
              aria-labelledby="dashboard-tab"
            >
              <section
                className="admin-overview"
                aria-label={t("Shop overview")}
              >
                <div className="admin-overview-heading">
                  <h2>{t("At a glance")}</h2>
                  <button
                    className="button white"
                    disabled={!!busy}
                    onClick={() => void refreshOverview()}
                  >
                    <RefreshCw size={17} />
                    {busy === "overview"
                      ? t("Refreshing…")
                      : t("Refresh overview")}
                  </button>
                </div>
                <div className="admin-overview-cards">
                  <button
                    className="overview-card pending"
                    aria-label={t("Pending orders: {{v0}}", {
                      v0: String(
                        ordersLoaded ? pendingOrders.length : "loading",
                      ),
                    })}
                    disabled={!!busy}
                    onClick={() => {
                      setTab("orders");
                      setOrderFilter("pending");
                    }}
                  >
                    <Clock3 size={23} />
                    <strong>{ordersLoaded ? pendingOrders.length : "…"}</strong>
                    <span>{t("New orders")}</span>
                    <small>{t("Awaiting your confirmation")}</small>
                  </button>
                  <button
                    className="overview-card ready"
                    aria-label={t("Ready for pickup: {{v0}}", {
                      v0: String(ordersLoaded ? readyOrders.length : "loading"),
                    })}
                    disabled={!!busy}
                    onClick={() => {
                      setTab("orders");
                      setOrderFilter("ready");
                    }}
                  >
                    <CheckCircle2 size={23} />
                    <strong>{ordersLoaded ? readyOrders.length : "…"}</strong>
                    <span>{t("Ready for pickup")}</span>
                    <small>{t("Prepared for customers to collect")}</small>
                  </button>
                  <button
                    className="overview-card stock"
                    aria-label={t("Low stock products: {{v0}}", {
                      v0: String(lowStock.length),
                    })}
                    disabled={!!busy}
                    onClick={() => {
                      setTab("products");
                      setProductFilter("low-stock");
                      setInventoryCategory("all");
                      setQuery("");
                    }}
                  >
                    <TriangleAlert size={23} />
                    <strong>{lowStock.length}</strong>
                    <span>{t("Low stock")}</span>
                    <small>{t("Real listings with 0–3 units left")}</small>
                  </button>
                </div>
              </section>
            </div>
          )}
          {error && (
            <div className="admin-error" role="alert">
              {t(error)}
            </div>
          )}
          {notice && (
            <div className="admin-notice" role="status">
              {t(notice)}
            </div>
          )}
          {tab === "catalogue" && <AdminPhoneCatalogue onError={fail} />}
          {tab === "products" && (
            <div
              id="admin-products"
              role="tabpanel"
              aria-labelledby={
                inventoryCategory === "all"
                  ? undefined
                  : `products-${inventoryCategory}-tab`
              }
              className="admin-products-layout"
            >
              {!productEditorOpen && (
                <section className="admin-panel">
                  <div className="admin-panel-title">
                    <h2>{t("Your catalogue")}</h2>
                    <button
                      className="button teal"
                      disabled={!!busy}
                      onClick={() => {
                        if (!mayDiscard()) return;
                        resetDraft(true);
                        setProductEditorOpen(true);
                      }}
                    >
                      <Plus size={17} />
                      {t("New product")}
                    </button>
                  </div>
                  <label className="sr-only" htmlFor="admin-product-search">
                    {t("Search catalogue")}
                  </label>
                  <details className="admin-import">
                    <summary>{t("Import inventory")}</summary>
                    <p>
                      {t(
                        "Import verified shop details. Existing products and order receipts are kept. Review the file before confirming.",
                      )}
                    </p>
                    <a
                      className="text-link"
                      href="/inventory-template.json"
                      download
                    >
                      {t("Download inventory template")}
                    </a>
                    <label htmlFor="inventory-file">
                      {t("Inventory JSON file")}
                    </label>
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
                        <h3>{t("Review inventory")}</h3>
                        <p>
                          {inventoryPreview.products.length}{" "}
                          {t(" real products to add ·")}{" "}
                          {inventoryPreview.preservedCount}{" "}
                          {t(" existing real listings to keep.")}
                        </p>
                        <ul>
                          {inventoryPreview.products.map((product, index) => (
                            <li key={index}>
                              <strong>
                                {product.brand} {product.name}
                              </strong>
                              <span>
                                {money(product.price)} · {product.stockQuantity}{" "}
                                {t("available")}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p>
                          {t(
                            "Check prices and counts before importing. Placeholder images stay labelled until you upload actual product photos.",
                          )}
                        </p>
                        <button
                          className="button dark"
                          disabled={!!busy}
                          onClick={() => void importInventory()}
                        >
                          {busy === "import"
                            ? t("Importing…")
                            : t("Import products")}
                        </button>
                      </div>
                    )}
                  </details>
                  <input
                    id="admin-product-search"
                    className="admin-product-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("Search products or brands…")}
                  />
                  <div
                    className="admin-filter-bar"
                    aria-label={t("Filter inventory")}
                  >
                    <button
                      aria-pressed={productFilter === "all"}
                      onClick={() => setProductFilter("all")}
                    >
                      {t("All stock levels")}
                    </button>
                    <button
                      aria-pressed={productFilter === "low-stock"}
                      onClick={() => setProductFilter("low-stock")}
                    >
                      {t("Low stock")}
                    </button>
                    <button aria-pressed={productFilter === "review"} onClick={() => setProductFilter("review")}>{t("Needs review")} ({needsReview.length})</button>
                  </div>
                  {productFilter === "low-stock" && (
                    <p className="admin-help">
                      {t("Products with 0–3 units available.")}
                    </p>
                  )}
                  <div className="admin-product-list">
                    {shownProducts.map((p) => (
                      <article className="admin-product" key={p.id}>
                        <SafeImage src={p.image} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          <span>
                            {p.brand} ·{" "}
                            {p.category === "used"
                              ? t("Second-hand")
                              : p.category === "new"
                                ? t("New mobile")
                                : t(p.accessoryCategory)}
                          </span>
                          <b>{money(p.price)}</b>
                          <span
                            className={
                              p.available
                                ? "admin-stock available"
                                : "admin-stock"
                            }
                          >
                            {p.stockQuantity === null
                              ? t("Set stock quantity")
                              : t("{{v0}} available", {
                                  v0: String(p.stockQuantity),
                                })}
                          </span>
                          <small>{p.reviewedAt ? `${t("Price and stock checked")}: ${new Date(p.reviewedAt).toLocaleDateString()}` : t("Price and stock have not been reviewed")}</small>
                        </div>
                        <QuickStock
                          product={p}
                          disabled={!!busy}
                          onSaved={() => refresh()}
                          onError={fail}
                        />
                        <div className="admin-product-actions">
                          <button className="button white" type="button" disabled={!!busy} onClick={() => void api(`/admin/products/${p.id}/review`, { method: "POST" }).then(() => refresh()).catch(fail)}>{t("Mark reviewed")}</button>
                          <button
                            className="icon-button"
                            disabled={!!busy}
                            onClick={() => selectProduct(p)}
                            aria-label={t("Edit {{v0}}", {
                              v0: String(p.name),
                            })}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="icon-button admin-remove"
                            disabled={!!busy}
                            onClick={() => void removeProduct(p)}
                            aria-label={t("Delete {{v0}}", {
                              v0: String(p.name),
                            })}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!shownProducts.length && (
                    <p className="admin-empty">
                      {productFilter === "low-stock" &&
                      !query &&
                      inventoryCategory === "all"
                        ? t("No real products have 3 or fewer units available.")
                        : t("No products match this search.")}
                    </p>
                  )}
                </section>
              )}
              {productEditorOpen && (
                <div className="admin-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
                <form
                  className={`admin-panel admin-editor${!draft.id && (draft.category === "new" || draft.category === "used") && catalogueMode === "catalogue" ? " catalogue-compact" : ""}${draft.category === "accessory" ? " accessory-simple" : ""}${catalogueAdvancedOpen ? " catalogue-advanced-open" : ""}`}
                  id="product-editor"
                  onSubmit={saveProduct}
                  noValidate
                >
                  <button
                    type="button"
                    className="button white inventory-back"
                    disabled={!!busy}
                    onClick={() => dirty ? setDiscardPrompt(true) : resetDraft()}
                  >
                    {t("Back to inventory")}
                  </button>
                  <button
                    type="button"
                    className="icon-button admin-editor-close"
                    aria-label={t("Close editor")}
                    disabled={!!busy}
                    onClick={() => dirty ? setDiscardPrompt(true) : resetDraft()}
                  >
                    ×
                  </button>
                  <h2 id="product-editor-title" tabIndex={-1}>
                    {draft.id ? t("Edit product") : t("Add a product")}
                  </h2>
                  {!draft.id && (draft.category === "new" || draft.category === "used") && (
                    <div className="admin-form-row catalogue-mode-switch" role="group" aria-label={t("New phone source")}>
                      <button type="button" className={`button ${catalogueMode === "catalogue" ? "dark" : "white"}`} onClick={() => { setCatalogueMode("catalogue"); setCatalogueFilled(false); }}>{t("Use Catalogue")}</button>
                      <button type="button" className={`button ${catalogueMode === "manual" ? "dark" : "white"}`} onClick={() => setCatalogueMode("manual")}>{t("Add Manually")}</button>
                    </div>
                  )}
                  <fieldset className="editor-section catalogue-basic">
                    <legend>{t("Basic details")}</legend>
                    <label htmlFor="product-name">{t("Product name *")}</label>
                    <input
                      id="product-name"
                      value={draft.name}
                      readOnly={!draft.id && catalogueMode === "catalogue" && catalogueFilled}
                      maxLength={100}
                      minLength={2}
                      required={!!draft.id || catalogueMode !== "catalogue"}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                    <label htmlFor="product-brand">{t("Brand *")}</label>
                    <input
                      id="product-brand"
                      value={draft.brand}
                      readOnly={!draft.id && catalogueMode === "catalogue" && catalogueFilled}
                      maxLength={60}
                      required={!!draft.id || catalogueMode !== "catalogue"}
                      onChange={(e) =>
                        setDraft({ ...draft, brand: e.target.value })
                      }
                    />
                    {!draft.id && (draft.category === "new" || draft.category === "used") && catalogueMode === "catalogue" && (
                      <button type="button" className="button white catalogue-picker-toggle" onClick={() => setCataloguePickerOpen((open) => !open)}>{cataloguePickerOpen ? t("Hide phone catalogue") : t("Choose phone from catalogue")}</button>
                    )}
                    {!draft.id && (draft.category === "new" || draft.category === "used") && catalogueMode === "catalogue" && cataloguePickerOpen && (
                      <fieldset className="catalogue-autofill editor-section">
                        <legend>{t("Fill from phone catalogue")}</legend>
                        <div className="admin-filter-bar catalogue-image-filters" aria-label={t("Filter catalogue phones by image count")}>
                          {(["all", 3, 2, 1, 0] as const).map((filter) => {
                            const count = filter === "all" ? catalogueDeviceRows.length : catalogueDeviceRows.filter((phone) => filter === 3 ? (phone.catalogueImageCount || 0) >= 3 : (phone.catalogueImageCount || 0) === filter).length;
                            const label = filter === "all" ? t("All") : filter === 0 ? t("No Photos") : `${filter} ${filter === 1 ? t("Photo") : t("Photos")}`;
                            return <button key={String(filter)} type="button" aria-pressed={catalogueImageFilter === filter} onClick={() => { setCatalogueImageFilter(filter); setCatalogueModel(""); setCatalogueVariant(""); }}>{label} ({count})</button>;
                          })}
                        </div>
                        <label htmlFor="catalogue-search">{t("Search phone model")}</label>
                        <input id="catalogue-search" className="catalogue-search" value={catalogueSearch} onChange={(event) => setCatalogueSearch(event.target.value)} placeholder={t("Search by brand, model or keyword…")} />
                        <div className="catalogue-phone-grid" role="listbox" aria-label={t("Catalogue phone models")}>
                          {catalogueCards.slice(0, 60).map((phone) => { const count = phone.catalogueImageCount || 0; const selected = catalogueBrand === phone.brand && catalogueModel === phone.model; return <button type="button" role="option" aria-selected={selected} className={`catalogue-phone-card${selected ? " selected" : ""}`} key={phone.deviceId} onClick={() => { setCatalogueBrand(phone.brand); setCatalogueModel(phone.model); setCatalogueVariant(""); }}>
                            <SafeImage className="catalogue-phone-thumb" src={phone.catalogueImage || "/assets/phone.svg"} alt="" />
                            <strong>{phone.brand} {phone.model}</strong>
                            <span className={`catalogue-image-count catalogue-image-count-${count >= 3 ? 3 : count}`}>{count >= 3 ? "3+ Photos" : count === 1 ? "1 Photo" : `${count} Photos`}</span>
                            <small>{Array.from(new Set(cataloguePhones.filter((item) => item.deviceId === phone.deviceId).map((item) => item.variant.replace(/^.*?·\s*/, "")).filter(Boolean))).join(" · ")}</small>
                          </button>; })}
                        </div>
                        {!catalogueCards.length && <p className="admin-empty">{t("No catalogue phones match this filter.")}</p>}
                        {catalogueModel && (() => { const phone = catalogueModels.find((item) => item.model === catalogueModel); const count = phone?.catalogueImageCount || 0; return <p className={`catalogue-image-count catalogue-image-count-${count >= 3 ? 3 : count}`}>{count >= 3 ? "3+ Photos" : count === 1 ? "1 Photo" : `${count} Photos`}</p>; })()}
                        <label htmlFor="catalogue-variant">{t("Catalogue variant")}</label>
                        <select id="catalogue-variant" value={catalogueVariant} disabled={!catalogueModel} onChange={(event) => { setCatalogueVariant(event.target.value); const selected = uniqueCatalogueVariants.find((phone) => phone.variant === event.target.value); if (selected) { setDraft((current) => ({ ...current, brand: selected.brand, name: selected.model, ram: selected.ram, storage: selected.storage, image: "/assets/phone.svg", images: ["/assets/phone.svg"], description: current.description || `${selected.brand} ${selected.model} · ${selected.variant}` })); setSpecRows([{ name: "Warranty", value: "Confirm with shop" }, ...Object.entries(selected.specs).filter(([name]) => name !== "RAM" && name !== "Storage").map(([name, value]) => ({ name, value }))]); setCatalogueFilled(true); setCataloguePickerOpen(false); } }}>
                          <option value="">{t("Choose a RAM/storage variant")}</option>
                          {uniqueCatalogueVariants.map((phone) => <option key={`${phone.deviceId}-${phone.variant}`} value={phone.variant}>{phone.variant}</option>)}
                        </select>
                        <button type="button" className="button white" disabled={!catalogueVariant || busy === "save"} onClick={fillFromCatalogue}>{t("Fill from Catalogue")}</button>
                        {uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant)?.catalogueImage && (
                          <SafeImage
                            className="admin-catalogue-preview"
                            src={uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant)?.catalogueImage || ""}
                            alt={t("Catalogue image preview")}
                          />
                        )}
                      </fieldset>
                    )}
                    <div className="admin-form-row">
                      <div>
                        <label htmlFor="product-category">
                          {t("Category")}
                        </label>
                        <select
                          id="product-category"
                          className="admin-category-select"
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
                              stockQuantity: !draft.id && category === "used" ? 1 : draft.stockQuantity,
                              image,
                              images: [
                                image,
                                ...productImages(draft).filter(
                                  (value) =>
                                    value !== draft.image && value !== image,
                                ),
                              ],
                              ram: draft.ram || 8,
                              storage: draft.storage || 128,
                              condition: draft.condition,
                              battery: draft.battery,
                              accessoryCategory:
                                draft.accessoryCategory || "Mobile Covers",
                            });
                          }}
                        >
                          <option value="new">{t("New mobile")}</option>
                          <option value="used">{t("Second-hand set")}</option>
                          <option value="accessory">{t("Accessory")}</option>
                        </select>
                      </div>
                    </div>
                    {draft.category !== "accessory" ? (
                      <div className="admin-form-row">
                        <div>
                          <label htmlFor="product-ram">{t("RAM (GB)")}</label>
                          <input
                            id="product-ram"
                            type="number"
                            min={1}
                            max={64}
                            step={1}
                            value={draft.ram ?? ""}
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
                          <label htmlFor="product-storage">
                            {t(`Storage (GB)${catalogueMode === "catalogue" ? "" : " *"}`)}
                          </label>
                          <input
                            id="product-storage"
                            type="number"
                            min={16}
                            max={2048}
                            step={1}
                            value={draft.storage ?? ""}
                            required={!!draft.id || catalogueMode !== "catalogue"}
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
                          {t("Accessory category")}
                        </label>
                        <select
                          id="product-accessory-category"
                          value={
                            draft.accessoryCategory || accessoryCategories[0]
                          }
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              accessoryCategory: e.target.value,
                            })
                          }
                        >
                          {accessoryCategories.map((category) => (
                            <option key={category} value={category}>
                              {t(category)}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {draft.category === "used" && (
                      <div className="used-phone-details"><div className="admin-form-row">
                        <div>
                          <label htmlFor="product-condition">
                            {t("Condition")}
                          </label>
                          <select
                            id="product-condition"
                            value={draft.condition || ""}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                condition: e.target
                                  .value as Product["condition"],
                              })
                            }
                          >
                            <option value="" disabled>
                              {t("Inspection pending")}
                            </option>
                            {["Like New", "Excellent", "Good", "Fair"].map(
                              (condition) => (
                                <option key={condition} value={condition}>
                                  {t(condition)}
                                </option>
                              ),
                            )}
                          </select>
                          <small>{t("Like New: minimal wear · Excellent: minor wear · Good: visible normal wear · Fair: noticeable wear and disclosed issues")}</small>
                        </div>
                        <div>
                          <label htmlFor="product-battery">
                            {t("Battery health (%)")}
                          </label>
                          <input
                            id="product-battery"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={draft.battery ?? ""}
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
                      <fieldset className="used-inspection-editor">
                        <legend>{t("Used-phone inspection")}</legend>
                        {(["screen", "body", "cameras", "charging", "speakers", "microphone", "buttons", "biometrics", "network", "wireless"] as const).map((key) => <label key={key}>{t(key)}
                          <select value={draft.inspection?.checks?.[key] || "not_checked"} onChange={(event) => setDraft({ ...draft, inspection: { checks: { screen: "not_checked", body: "not_checked", cameras: "not_checked", charging: "not_checked", speakers: "not_checked", microphone: "not_checked", buttons: "not_checked", biometrics: "not_checked", network: "not_checked", wireless: "not_checked", ...draft.inspection?.checks, [key]: event.target.value as "not_checked" | "passed" | "issue" }, defects: draft.inspection?.defects || "", included: draft.inspection?.included || "" } })}>
                            <option value="not_checked">{t("Not checked")}</option><option value="passed">{t("Passed")}</option><option value="issue">{t("Issue found")}</option>
                          </select>
                        </label>)}
                        <label>{t("What changed in this phone?")}<textarea maxLength={500} placeholder={t("Describe scratches, replaced parts, repairs, or other changes")} value={draft.inspection?.defects || ""} onChange={(event) => setDraft({ ...draft, inspection: { checks: { screen: "not_checked", body: "not_checked", cameras: "not_checked", charging: "not_checked", speakers: "not_checked", microphone: "not_checked", buttons: "not_checked", biometrics: "not_checked", network: "not_checked", wireless: "not_checked", ...draft.inspection?.checks }, defects: event.target.value, included: draft.inspection?.included || "" } })} /></label>
                        <label>{t("Included accessories")}<input maxLength={300} value={draft.inspection?.included || ""} onChange={(event) => setDraft({ ...draft, inspection: { checks: { screen: "not_checked", body: "not_checked", cameras: "not_checked", charging: "not_checked", speakers: "not_checked", microphone: "not_checked", buttons: "not_checked", biometrics: "not_checked", network: "not_checked", wireless: "not_checked", ...draft.inspection?.checks }, defects: draft.inspection?.defects || "", included: event.target.value } })} /></label>
                      </fieldset></div>
                    )}
                  </fieldset>
                  <fieldset className="editor-section catalogue-advanced">
                    <legend>{t("Photos")}</legend>
                    <label htmlFor="product-image">{t("Illustration")}</label>
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
                              (value) =>
                                value !== draft.image && value !== image,
                            ),
                          ],
                        });
                      }}
                    >
                      {draft.image.startsWith("/api/images/") && (
                        <option value={draft.image}>
                          {t("Uploaded product photo")}
                        </option>
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
                          {t(label)}
                        </option>
                      ))}
                    </select>
                    <label className="admin-field-label" htmlFor="product-photo">{t("Product photo")}</label>
                    <label className="button white admin-upload-button" htmlFor="product-photo">{t("Upload product photos")}</label>
                    <input
                      id="product-photo"
                      className="admin-file-input"
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
                      {t(
                        "Add up to six photos. JPG, PNG, or WebP · up to 5 MB each. Choose the cover photo below.",
                      )}
                    </span>
                    <div className="admin-photo-grid">
                      {productImages(draft).map((image, index, photos) => {
                        const cataloguePreview = image === "/assets/phone.svg" ? draft.catalogueImage?.url : undefined;
                        const displayImage = cataloguePreview || image;
                        return (
                        <div className="admin-photo-tile" key={image}>
                          <SafeImage
                            src={displayImage}
                            alt={t("Product photo {{v0}} preview", {
                              v0: String(index + 1),
                            })}
                          />
                          <strong>
                            {cataloguePreview
                              ? t("Catalogue image preview")
                              : index === 0
                                ? t("Cover photo")
                                : t("Photo {{v0}}", { v0: String(index + 1) })}
                          </strong>
                          <button
                            type="button"
                            disabled={!!busy || index === 0}
                            title={index === 0 ? t("This is already the cover photo") : t("Make this photo the cover")}
                            aria-label={t("Make photo {{v0}} cover", {
                              v0: String(index + 1),
                            })}
                            onClick={() => {
                              const images = [
                                image,
                                ...photos.filter((value) => value !== image),
                              ];
                              setDraft({ ...draft, image, images });
                            }}
                          >
                            {t("Use as cover")}
                          </button>
                          <button
                            type="button"
                            disabled={!!busy || photos.length === 1}
                            title={photos.length === 1 ? t("Add another photo before removing this one") : t("Remove this photo")}
                            aria-label={t("Remove photo {{v0}}", {
                              v0: String(index + 1),
                            })}
                            onClick={() => {
                              const images = photos.filter(
                                (value) => value !== image,
                              );
                              setDraft({ ...draft, image: images[0], images });
                            }}
                          >
                            {t("Remove")}
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="editor-section catalogue-store-details">
                    <legend>{t("Store details")}</legend>
                    <div className="admin-form-row"><label>{t("Price (NPR) *")}<input id="catalogue-price" type="number" min={0} max={100000000} step={1} value={Number.isFinite(draft.price) && draft.price > 0 ? draft.price : ""} required onChange={(e) => setDraft({ ...draft, price: e.target.value === "" ? 0 : Number(e.target.value) })} /></label><label>{t("Stock *")}<input id="catalogue-stock" type="number" min={0} max={1000000} step={1} value={draft.stockQuantity !== null && Number.isFinite(draft.stockQuantity) ? draft.stockQuantity : ""} required onChange={(e) => setDraft({ ...draft, stockQuantity: e.target.value === "" ? 0 : Number(e.target.value) })} /></label></div>
                    <div className="admin-form-row"><label>{t("Color")}<input value={draft.color || ""} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></label><label>{t("Warranty")}<input value={specRows.find((row) => row.name === "Warranty")?.value || ""} onChange={(e) => setSpecRows(specRows.map((row) => row.name === "Warranty" ? { ...row, value: e.target.value } : row))} /></label></div>
                    {uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant) && (!uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant)?.ram || !uniqueCatalogueVariants.find((phone) => phone.variant === catalogueVariant)?.storage) && <p className="summary-note">{t("Only the catalogue values are applied; missing RAM or storage is left blank.")}</p>}
                    <p className="summary-note">✓ {t("Specifications automatically loaded from catalogue")}<br />✓ {t("Catalogue image automatically connected")}</p>
                    <button type="button" className="button white" onClick={() => setCatalogueAdvancedOpen((open) => !open)}>{catalogueAdvancedOpen ? t("Hide catalogue details") : t("View / edit catalogue details")}</button>
                  </fieldset>
                  <div className="catalogue-advanced catalogue-advanced accessory-hide"><ProductFinanceEditor draft={draft} onChange={setDraft} /></div>
                  <fieldset className="editor-section catalogue-advanced accessory-hide">
                    <legend>{t("Descriptions & specifications")}</legend>
                    <label htmlFor="product-description">
                      {t("English description *")}
                    </label>
                    <textarea
                      id="product-description"
                      rows={4}
                      value={draft.description}
                      maxLength={2000}
                      required={!!draft.id || catalogueMode !== "catalogue"}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                    <label htmlFor="product-description-ne">
                      {t("Nepali description")}
                    </label>
                    <textarea
                      id="product-description-ne"
                      lang="ne"
                      rows={4}
                      maxLength={2000}
                      value={draft.descriptionNe || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, descriptionNe: e.target.value })
                      }
                    />
                    <p className="summary-note">
                      {t(
                        "English is shown when a Nepali description is unavailable.",
                      )}
                    </p>
                    <h3>{t("Specifications")}</h3>
                    <div className="specification-rows">
                      {specRows.map((row, index) => (
                        <div className="specification-row" key={index}>
                          <input
                            aria-label={t("Specification {{v0}} name", {
                              v0: String(index + 1),
                            })}
                            placeholder={t("Name")}
                            value={row.name}
                            maxLength={50}
                            onChange={(e) =>
                              setSpecRows(
                                specRows.map((item, i) =>
                                  i === index
                                    ? { ...item, name: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          <input
                            aria-label={t("Specification {{v0}} value", {
                              v0: String(index + 1),
                            })}
                            placeholder={t("Value")}
                            maxLength={200}
                            value={row.value}
                            onChange={(e) =>
                              setSpecRows(
                                specRows.map((item, i) =>
                                  i === index
                                    ? { ...item, value: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={t("Remove specification {{v0}}", {
                              v0: String(index + 1),
                            })}
                            onClick={() =>
                              setSpecRows(
                                specRows.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="button white"
                      disabled={specRows.length >= 20}
                      onClick={() =>
                        setSpecRows([...specRows, { name: "", value: "" }])
                      }
                    >
                      {t("Add specification")}
                    </button>
                  </fieldset>
                  <fieldset className="editor-section catalogue-advanced accessory-hide">
                    <legend>{t("Price & stock")}</legend>
                    <div>
                      <label htmlFor="product-price">
                        {t("Price (NPR) *")}
                      </label>
                      <input
                        id="product-price"
                        type="number"
                        min={0}
                        max={100000000}
                        step={1}
                        value={Number.isFinite(draft.price) ? draft.price : ""}
                        required={!!draft.id || catalogueMode !== "catalogue"}
                        onChange={(e) =>
                          setDraft({ ...draft, price: e.target.valueAsNumber })
                        }
                      />
                    </div>
                    <label className="admin-check">
                      <input
                        type="checkbox"
                        checked={draft.priceIsEstimate === true}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            priceIsEstimate: e.target.checked,
                            isSample: false,
                          })
                        }
                      />
                      <span>
                        {t(
                          "Temporary estimated price — confirm before selling",
                        )}
                      </span>
                    </label>
                    <label htmlFor="product-stock">
                      {t("Stock quantity *")}
                    </label>
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
                      required={!!draft.id || catalogueMode !== "catalogue"}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          stockQuantity: e.target.valueAsNumber,
                        })
                      }
                    />
                    <p className="summary-note">
                      {t(
                        "Enter units available for new orders. Existing orders already reserve their units. Set 0 for out of stock.",
                      )}
                    </p>
                  </fieldset>
                  <div className="button-row editor-save-bar">
                    <button
                      className="button dark"
                      type="submit"
                      disabled={!!busy}
                    >
                      {busy === "save" ? t("Saving…") : t("Save product")}
                    </button>
                    {(draft.id || dirty) && (
                      <button
                        className="button white"
                        type="button"
                        disabled={!!busy}
                        onClick={() => resetDraft()}
                      >
                        {t("Cancel editing")}
                      </button>
                    )}
                  </div>
                </form>
                </div>
              )}
            </div>
          )}
          {tab === "staff" && role === "owner" && (
            <StaffManager onError={fail} />
          )}
          {tab === "sales" && <section className="admin-panel admin-sales-page" id="admin-sales" role="tabpanel" aria-labelledby="sales-tab">
            <div className="admin-sales-heading"><div><span className="eyebrow">{t("Shop admin")} / {t("Sales")}</span><h2>{t("Sales")}</h2></div><div className="sales-periods">{([["today", "Today"], ["7days", "7 Days"], ["month", "This Month"], ["all", "All Time"]] as const).map(([value, label]) => <button key={value} className={salesRange === value ? "active" : ""} onClick={() => setSalesRange(value)}>{t(label)}</button>)}<button className="button dark" onClick={() => setTab("billing")}>＋ {t("Record shop sale")}</button></div></div>
            <div className="sales-summary-cards"><div><span>{t("Total sales")}</span><strong>{money(filteredSalesTotal)}</strong></div><div><span>{t("Website sales")}</span><strong>{money(filteredSalesTotal)}</strong></div><div><span>{t("Shop sales")}</span><strong>{money(0)}</strong></div></div>
            <div className="admin-sales-history"><div className="admin-panel-title"><h3>{t("Recent sales")}</h3></div>{salesOrders.map((order) => <div className="admin-sales-row" key={order.id}><span><strong>#{order.id}</strong><small>{new Date(order.date).toLocaleString()} · {t("Website")}</small></span><span>{order.name}</span><span>{order.payment?.method === "MANUAL_QR" ? t("Manual QR") : order.payment?.method === "ESEWA" ? "eSewa" : t("Pay at shop")}</span><strong>{money(order.total)}</strong><button className="button white" onClick={() => setSelectedOrderId(order.id)}>{t("View")}</button></div>)}{!salesOrders.length && <p>{t("No completed sales in this period.")}</p>}</div>
          </section>}
          {tab === "billing" && <div id="admin-billing" role="tabpanel" aria-labelledby="billing-tab"><AdminBilling products={products} onStockChanged={refresh} /></div>}
          {tab === "qr" && <div id="admin-payment-qr" role="tabpanel" aria-labelledby="payment-qr-tab"><AdminPaymentQr /></div>}
          {tab === "repairs" && <div id="admin-repairs" role="tabpanel" aria-labelledby="repairs-tab"><AdminRepairs /></div>}
          {tab === "orders" && (
            <section
              id="admin-orders"
              role="tabpanel"
              aria-labelledby="orders-tab"
              className="admin-panel"
            >
              <div className="admin-panel-title">
                <h2>{t(selectedOrder ? "Order details" : "Pickup orders")}</h2>
                <button
                  className="button white"
                  onClick={() => void loadOrders().catch(fail)}
                >
                  {t("Refresh orders")}
                </button>
              </div>
              {!selectedOrder && (
                <>
                  <div className="order-search-controls">
                    <label>
                      <span>{t("Search orders")}</span>
                      <input
                        placeholder={t("Reference, customer name or phone")}
                        value={orderQuery}
                        onChange={(e) => setOrderQuery(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>{t("Order date")}</span>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </label>
                    {(orderQuery || dateFilter) && (
                      <button
                        className="button white"
                        onClick={() => {
                          setOrderQuery("");
                          setDateFilter("");
                        }}
                      >
                        {t("Clear search")}
                      </button>
                    )}
                  </div>
                  <div
                    className="admin-filter-bar"
                    aria-label={t("Filter pickup orders")}
                  >
                    {(
                      [
                        ["all", "All orders"],
                        ["pending", "New orders"],
                        ["confirmed", "Confirmed"],
                        ["completed", "Completed"],
                        ["cancelled", "Cancelled"],
                        ["attention", "Needs attention"],
                        ["ready", "Ready for pickup"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        aria-pressed={orderFilter === value}
                        onClick={() => setOrderFilter(value)}
                      >
                        {t(label)}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {!ordersLoaded ? (
                <p className="admin-empty" role="status">
                  {t("Loading pickup orders…")}
                </p>
              ) : !shownOrders.length && !storeSales.length && !selectedOrder ? (
                <div className="admin-empty">
                  <ShoppingBag size={35} />
                  <h3>
                    {orders.length
                      ? t("No orders match these filters.")
                      : t("No pickup orders yet.")}
                  </h3>
                  <p>
                    {orders.length
                      ? t("Clear the search or choose another filter.")
                      : t("Orders created on the storefront will appear here.")}
                  </p>
                </div>
              ) : (
                <div className="admin-orders compact-orders">
                  {selectedOrder && !emailConfigured && (
                    <p className="admin-email-note" role="status">
                      {t(
                        "Email sending is not configured yet. Messages are saved in the queue and will send once the email service is connected.",
                      )}
                    </p>
                  )}
                  {selectedOrder ? (
                    <div className="admin-order-detail">
                      <button
                        id="back-to-orders"
                        type="button"
                        className="button white"
                        disabled={!!busy}
                        onClick={() => {
                          const id = selectedOrderId;
                          setSelectedOrderId(null);
                          requestAnimationFrame(() =>
                            document
                              .getElementById(`order-open-${id}`)
                              ?.focus(),
                          );
                        }}
                      >
                        {t("Back to orders")}
                      </button>
                      {[selectedOrder].map((order) => (
                        <article className="admin-order" key={order.id}>
                          <div className="admin-order-top">
                            <div>
                              <strong>{order.id}</strong>
                              <span>
                                {new Date(order.date).toLocaleString(
                                  currentLanguage() === "ne"
                                    ? "ne-NP"
                                    : "en-GB",
                                  {
                                    timeZone: "Asia/Kathmandu",
                                  },
                                )}
                              </span>
                            </div>
                            <strong>{money(order.total)}</strong>
                          </div>
                          <div className="admin-order-customer">
                            <strong>{order.name}</strong>
                            <a href={`tel:${order.phone}`}>{order.phone}</a>
                            {order.email && (
                              <a href={`mailto:${order.email}`}>
                                {order.email}
                              </a>
                            )}
                            <span>{t("Shop pickup")}</span>
                          </div>
                          {order.payment && ["MANUAL_QR", "ESEWA"].includes(order.payment.method) && <div className="admin-payment-review"><strong>{t("QR payment")}</strong><span>{t("Status")}: {order.payment.status}</span>{order.payment.reference && <span>{t("Reference")}: {order.payment.reference}</span>}{["VERIFICATION_PENDING", "PENDING_VERIFICATION"].includes(order.payment.status) && <div className="button-row"><button className="button dark" disabled={!!busy} onClick={() => void reviewPayment(order, "PAID")}>{t("Verify payment")}</button><button className="button white" disabled={!!busy} onClick={() => void reviewPayment(order, "REJECTED")}>{t("Reject payment")}</button></div>}</div>}
                          <ul>
                            {order.items.map((item) => (
                              <li key={item.product.id}>
                                <span>
                                  {item.product.name} × {item.quantity}
                                </span>
                                <b>
                                  {money(item.product.price * item.quantity)}
                                </b>
                              </li>
                            ))}
                          </ul>
                          {order.note && (
                            <p className="admin-order-note">
                              {t("Note: ")}
                              {order.note}
                            </p>
                          )}
                          <div className="admin-order-actions">
                            <strong className="order-status">
                              {t(order.status)}
                            </strong>
                            {order.status !== "Completed" &&
                              order.status !== "Cancelled" && (
                                <>
                                  <button
                                    className="button dark"
                                    disabled={!!busy}
                                    onClick={() => {
                                      const next =
                                        nextActions[
                                          order.status as keyof typeof nextActions
                                        ];
                                      if (next[0] === "Completed")
                                        setClosingOrder({
                                          order,
                                          status: "Completed",
                                        });
                                      else void updateStatus(order, next[0]);
                                    }}
                                  >
                                    {t(
                                      nextActions[
                                        order.status as keyof typeof nextActions
                                      ][1],
                                    )}
                                  </button>
                                  <button
                                    className="button white"
                                    disabled={!!busy}
                                    onClick={() =>
                                      setClosingOrder({
                                        order,
                                        status: "Cancelled",
                                      })
                                    }
                                  >
                                    {t("Cancel order")}
                                  </button>
                                </>
                              )}
                          </div>
                          {order.status === "Cancelled" && (
                            <p className="summary-note">
                              {t(
                                "Order closed. New orders return reserved units to stock on cancellation.",
                              )}
                            </p>
                          )}
                          {order.status === "Completed" && (
                            <p className="summary-note">
                              {t("Order closed. Pickup is complete.")}
                              {order.handover && <> {t("Handed over by")} {order.handover.by} · {new Date(order.handover.date).toLocaleString()}</>}
                            </p>
                          )}
                          <div className="admin-email-updates">
                            <strong>{t("Email updates")}</strong>
                            {!order.email ? (
                              <p>
                                {t("This older order has no email address.")}
                              </p>
                            ) : (
                              <ul>
                                {order.emailNotifications?.map((email) => (
                                  <li key={email.id}>
                                    <div>
                                      <span>
                                        {email.kind === "received"
                                          ? t("Order received")
                                          : email.orderStatus}
                                      </span>
                                      <small>
                                        {email.state === "accepted"
                                          ? t("Accepted by email service")
                                          : email.state === "failed"
                                            ? t("Needs attention")
                                            : t("Queued")}
                                      </small>
                                      {email.state === "failed" && (
                                        <p>{t(email.error)}</p>
                                      )}
                                    </div>
                                    {email.state === "failed" &&
                                      emailConfigured && (
                                        <button
                                          className="button white"
                                          disabled={!!busy}
                                          onClick={() =>
                                            void retryEmail(email.id)
                                          }
                                        >
                                          {t("Retry email")}
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
                  ) : (
                    <>
                    {shownOrders.map((order) => (
                      <article className="admin-order-summary" key={order.id}>
                        <div className="order-summary-reference">
                          <strong>{order.id}</strong>
                          <span>
                            {new Date(order.date).toLocaleString(
                              currentLanguage() === "ne" ? "ne-NP" : "en-GB",
                              {
                                timeZone: "Asia/Kathmandu",
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            )}
                          </span>
                        </div>
                        <div className="order-summary-customer">
                          <strong>{order.name}</strong>
                          <span className="order-source-badge">{t("Website order")}</span>
                          <span>
                            {t("{{count}} items", {
                              count: order.items.reduce(
                                (total, item) => total + item.quantity,
                                0,
                              ),
                            })}
                          </span>
                        </div>
                        <strong className="order-summary-total">
                          {money(order.total)}
                        </strong>
                        <span className="order-status">{t(order.status)}</span>
                        {order.status === "Completed" && (
                          <button
                            type="button"
                            className="button white order-bill-button"
                            disabled={busy === `bill-${order.id}`}
                            onClick={() => void printOrderBill(order)}
                          >
                            {busy === `bill-${order.id}` ? t("Preparing…") : order.billIssued ? t("Print bill") : t("Create bill")}
                          </button>
                        )}
                        <button
                          id={`order-open-${order.id}`}
                          type="button"
                          className="button white"
                          aria-label={t("Open order {{reference}}", {
                            reference: order.id,
                          })}
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          {t("Open order")} <ArrowUpRight size={16} />
                        </button>
                      </article>
                      ))}
                    {storeSales
                      .filter((sale) => {
                        if (orderQuery && !`${sale.id} ${sale.customerName}`.toLowerCase().includes(orderQuery.toLowerCase())) return false;
                        if (dateFilter && !sale.date.startsWith(dateFilter)) return false;
                        return orderFilter === "all" || orderFilter === "completed";
                      })
                      .map((sale) => (
                        <article className="admin-order-summary" key={sale.id}>
                          <div className="order-summary-reference"><strong>{sale.id}</strong><span>{new Date(sale.date).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu", dateStyle: "medium", timeStyle: "short" })}</span></div>
                          <div className="order-summary-customer"><strong>{sale.customerName || t("Walk-in customer")}</strong><span className="order-source-badge in-store">{t("In-store order")}</span><span>{t("Completed")}</span></div>
                          <strong className="order-summary-total">{money(sale.total)}</strong>
                          <span className="order-status">{t("Completed")}</span>
                          <span className="order-payment-label">{sale.paymentMethod}</span>
                          <span />
                        </article>
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
      {closingOrder && (
        <OrderCloseDialog
          value={closingOrder}
          busy={!!busy}
          onCancel={() => setClosingOrder(null)}
          onConfirm={async () => {
            if (await updateStatus(closingOrder.order, closingOrder.status))
              setClosingOrder(null);
          }}
        />
      )}
      {discardPrompt && <div className="modal-backdrop" role="presentation"><div className="admin-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="discard-title"><h2 id="discard-title">{t("Leave product editor?")}</h2><p>{t("Your unsaved product changes will be lost.")}</p><div className="button-row"><button className="button white" onClick={() => setDiscardPrompt(false)}>{t("Keep editing")}</button><button className="button dark" onClick={() => { setDiscardPrompt(false); resetDraft(); }}>{t("Leave without saving")}</button></div></div></div>}
    </div>
  );
}









