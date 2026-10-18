import { LanguageProvider, useLanguage, useT } from "./context/LanguageContext";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { FavouritesProvider } from "./context/FavouritesContext";
import Layout from "./components/Layout";
const Checkout = React.lazy(() => import("./pages/Checkout"));
const OrderSuccess = React.lazy(async () => ({ default: (await import("./pages/Checkout")).OrderSuccess }));
import NotFound from "./pages/NotFound";
const Admin = React.lazy(() => import("./pages/Admin"));
const Home = React.lazy(() => import("./pages/ReferenceHome"));
const Favourites = React.lazy(() => import("./pages/Favourites"));
const Compare = React.lazy(() => import("./pages/Compare"));
const Shop = React.lazy(() => import("./pages/Shop"));
const Catalogue = React.lazy(() => import("./pages/Catalogue"));
const Product = React.lazy(() => import("./pages/Product"));
const Cart = React.lazy(() => import("./pages/Cart"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Repair = React.lazy(() => import("./pages/Repair"));
const Account = React.lazy(() => import("./pages/Account"));
const Login = React.lazy(async () => ({ default: (await import("./pages/Account")).Login }));
const MyOrders = React.lazy(() => import("./pages/MyOrders"));
import { CustomerProvider, useCustomer } from "./context/CustomerContext";
import "./admin.css";
import { ProductProvider, useProducts } from "./context/ProductContext";
import { shop } from "./data/shop";
import "./styles.css";
import "./mobile.css";
import "./storefront.css";
import "./bright.css";
import "./reference.css";
import "./account.css";
import "./product-gallery.css";
import "./shopping.css";
import "./refinement.css";
import "./sky-theme.css";
import "./workflow.css";
import "./ruby-theme.css";
import "./operations.css";
import "./bugfix.css";
import { ThemeProvider } from "./context/ThemeContext";
function RouteLoading() {
  const t = useT();
  return (
    <div className="container empty-state" role="status">
      {t("Opening the shop…")}
    </div>
  );
}
function ProductRouteGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { loading, error, retry } = useProducts();
  const t = useT();
  const needsCatalogue = ["/shop", "/mobiles", "/second-hand", "/accessories", "/search", "/cart", "/checkout", "/favourites"].includes(pathname) || pathname.startsWith("/product/") || pathname.startsWith("/checkout/");
  if (!needsCatalogue) return children;
  // Keep the route shell interactive while the catalogue request refreshes.
  // ProductContext serves cached products immediately when available.
  if (loading) return children;
  if (error) return <div className="shop-loading-screen" role="alert"><h1>{t("Let’s reconnect.")}</h1><p>{t(error)}</p><button className="button dark" onClick={() => void retry()}>{t("Try again")}</button></div>;
  return children;
}
function Meta() {
  const t = useT();
  const { language } = useLanguage();
  const { products } = useProducts();
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Mobile Shop in Lekhnath, Pokhara",
      "/mobiles": "New Mobile Phones",
      "/second-hand": "Second-Hand Phones",
      "/accessories": "Mobile & Electronic Accessories",
      "/digital-meter-repair": "Bike & Vehicle Digital Meter Repair",
      "/mobile-repair": "Mobile Repair Services",
      "/cart": "Your Shopping Bag",
      "/checkout": "Shop Pickup Checkout",
      "/help": "Help",
      "/repair": "Repair",
      "/search": "Search Products",
      "/compare": "Compare phones",
      "/shop": "Shop",
      "/favourites": "Your favourites",
      "/not-admin": "Shop Admin",
      "/login": "Customer Login",
      "/account": "Your Profile",
      "/my-orders": "My Orders",
    };
    const p = products.find((p) => pathname === `/product/${p.slug}`);
    const title = p
      ? `${p.brand} ${p.name}`
      : pathname.startsWith("/order/")
        ? "Pickup Order"
        : pathname.startsWith("/not-admin/")
          ? "Shop Admin"
          : titles[pathname] || "Page Not Found";
    document.title = `${t(title)} | ${shop.name}`;
    const publicOrigin = "https://machhapuchhreeelectronics.vercel.app";
    const canonicalPath = pathname === "/" ? "" : pathname;
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `${publicOrigin}${canonicalPath}`;
    const setMeta = (selector: string, attribute: "name" | "property", content: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${selector}"]`);
      if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, selector); document.head.appendChild(element); }
      element.content = content;
    };
    const description = p ? (language === "ne" && p.descriptionNe ? p.descriptionNe : p.description) : `${title} at ${shop.name}, ${shop.location}. New mobiles, second-hand phones, accessories and repair services.`;
    setMeta("description", "name", description);
    setMeta("og:title", "property", document.title);
    setMeta("og:description", "property", description);
    setMeta("og:url", "property", canonical.href);
    setMeta("og:type", "property", p ? "product" : "website");
    setMeta("twitter:title", "name", document.title);
    setMeta("twitter:description", "name", description);
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        p
          ? language === "ne" && p.descriptionNe
            ? p.descriptionNe
            : p.description
          : language === "ne"
            ? `${t(title)}। लेखनाथको माछापुच्छ्रे इलेक्ट्रोनिक्स। नयाँ र पुराना फोन, एक्सेसरिज र मर्मत सेवा। खुल्ने समय ${shop.hours}। पसलबाट मात्र लिनुहोस्।`
            : `${title} at ${shop.name}, ${shop.location}. New mobiles, second-hand sets, accessories and repair enquiries. Shop pickup and eligible home delivery available.`,
      );
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute(
      "content",
      /\/(cart|checkout|order|search|not-admin|login|account|my-orders)/.test(
        pathname,
      )
        ? "noindex, nofollow"
        : "index, follow",
    );
  }, [pathname, products, language, t]);
  return null;
}
function OrderPage() {
  const { id } = useParams();
  const { customer } = useCustomer();
  return <OrderSuccess key={`${id}-${customer?.id || "guest"}`} id={id} />;
}
function PaymentPage() {
  const { id } = useParams();
  const { customer } = useCustomer();
  return <OrderSuccess key={`${id}-${customer?.id || "guest"}-payment`} id={id} paymentOnly />;
}
function ProductPage() {
  const { slug } = useParams();
  return <Product key={slug} />;
}
function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <CustomerProvider>
          <ProductProvider>
            <CartProvider>
              <FavouritesProvider>
                <Meta />
                <ProductRouteGate>
                <React.Suspense fallback={<RouteLoading />}>
                  <Routes>
                    <Route
                      path="not-admin/*"
                      caseSensitive
                      element={<Admin />}
                    />
                    <Route element={<Layout />}>
                      <Route index element={<Home />} />
                      <Route
                        path="mobiles"
                        element={<Catalogue key="new" category="new" />}
                      />
                      <Route
                        path="second-hand"
                        element={<Catalogue key="used" category="used" />}
                      />
                      <Route
                        path="accessories"
                        element={
                          <Catalogue key="accessory" category="accessory" />
                        }
                      />
                      <Route path="favourites" element={<Favourites />} />
                      <Route path="compare" element={<Compare />} />
                      <Route path="shop" element={<Shop />} />
                      <Route
                        path="search"
                        element={<Catalogue key="search" />}
                      />
                      <Route path="product/:slug" element={<ProductPage />} />
                      <Route path="cart" element={<Cart />} />
                      <Route path="checkout" element={<Checkout />} />
                      <Route path="checkout/review/*" element={<Checkout />} />
                      <Route path="login" element={<Login />} />
                      <Route path="account" element={<Account />} />
                      <Route path="my-orders" element={<MyOrders />} />
                      <Route path="order/:id" element={<OrderPage />} />
                      <Route path="order/:id/payment" element={<PaymentPage />} />
                      <Route path="help" element={<Contact />} />
                      <Route
                        path="contact"
                        element={<Navigate to="/help" replace />}
                      />
                      <Route path="repair" element={<Repair />} />
                      <Route
                        path="digital-meter-repair"
                        element={
                          <Navigate
                            to="/repair#digital-meter-repairs"
                            replace
                          />
                        }
                      />
                      <Route
                        path="mobile-repair"
                        element={
                          <Navigate to="/repair#phone-repairs" replace />
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </React.Suspense>
                </ProductRouteGate>
              </FavouritesProvider>
            </CartProvider>
          </ProductProvider>
        </CustomerProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
