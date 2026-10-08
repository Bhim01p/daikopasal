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
import Layout from "./components/Layout";
import Home from "./pages/ReferenceHome";
import Catalogue from "./pages/Catalogue";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout, { OrderSuccess } from "./pages/Checkout";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Account, { Login } from "./pages/Account";
import MyOrders from "./pages/MyOrders";
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
function Meta() {
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
      "/contact": "Contact & Help",
      "/search": "Search Products",
      "/admin": "Shop Admin",
      "/login": "Customer Login",
      "/account": "Your Profile",
      "/my-orders": "My Orders",
    };
    const p = products.find((p) => pathname === `/product/${p.slug}`);
    const title = p
      ? `${p.brand} ${p.name}`
      : pathname.startsWith("/order/")
        ? "Pickup Order"
        : titles[pathname] || "Page Not Found";
    document.title = `${title} | ${shop.name}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        p
          ? p.description
          : `${title} at ${shop.name}, ${shop.location}. New mobiles, second-hand sets, accessories and repair enquiries. Open ${shop.hours}. Shop pickup only.`,
      );
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute(
      "content",
      /\/(cart|checkout|order|search|admin|login|account|my-orders)/.test(
        pathname,
      )
        ? "noindex, nofollow"
        : "index, follow",
    );
  }, [pathname, products]);
  return null;
}
function OrderPage() {
  const { id } = useParams();
  const { customer } = useCustomer();
  return <OrderSuccess key={`${id}-${customer?.id || "guest"}`} id={id} />;
}
function ProductPage() {
  const { slug } = useParams();
  return <Product key={slug} />;
}
function App() {
  return (
    <BrowserRouter>
      <CustomerProvider>
        <ProductProvider>
          <CartProvider>
            <Meta />
            <Routes>
              <Route path="admin" element={<Admin />} />
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
                  element={<Catalogue key="accessory" category="accessory" />}
                />
                <Route path="search" element={<Catalogue key="search" />} />
                <Route path="product/:slug" element={<ProductPage />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="login" element={<Login />} />
                <Route path="account" element={<Account />} />
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="order/:id" element={<OrderPage />} />
                <Route path="contact" element={<Contact />} />
                <Route
                  path="digital-meter-repair"
                  element={
                    <Navigate to="/contact#digital-meter-repairs" replace />
                  }
                />
                <Route
                  path="mobile-repair"
                  element={<Navigate to="/contact#phone-repairs" replace />}
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </CartProvider>
        </ProductProvider>
      </CustomerProvider>
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
