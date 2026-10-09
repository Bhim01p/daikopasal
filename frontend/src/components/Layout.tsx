import { useT } from "../context/LanguageContext";
import { LanguageSwitch } from "../context/LanguageContext";
import { useState, useEffect } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Mountain,
  Menu,
  X,
  Search,
  ShoppingBag,
  ArrowUpRight,
  Phone,
  Home as HomeIcon,
  Smartphone,
  UserRound,
} from "lucide-react";
import { shop, whatsapp } from "../data/shop";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import AccountDialog from "./AccountDialog";
import WhatsAppIcon from "./WhatsAppIcon";
const links = [
  ["/", "Home"],
  ["/mobiles", "New phones"],
  ["/second-hand", "Used phones"],
  ["/accessories", "Accessories"],
  ["/help", "Help"],
  ["/repair", "Repair"],
  ["/my-orders", "My orders"],
];
export function Brand() {
  const t = useT();
  return (
    <Link
      to="/"
      className="brand"
      aria-label={t("{{v0}} home", { v0: String(shop.name) })}
    >
      <Mountain size={33} />
      <span>
        {shop.name.replace(/\s+Electronics$/i, "")}
        <small>{t("ELECTRONICS")}</small>
      </span>
    </Link>
  );
}
export default function Layout() {
  const t = useT();
  const { customer } = useCustomer();
  const { count, notice, dismiss } = useCart();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const shoppingPage =
    ["/", "/mobiles", "/second-hand", "/accessories", "/search"].includes(
      location.pathname,
    ) || location.pathname.startsWith("/product/");
  useEffect(() => {
    setMenu(false);
    setAccountOpen(false);
    const section = location.hash
      ? document.getElementById(location.hash.slice(1))
      : null;
    if (section) section.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  useEffect(() => {
    if (!menu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);
  return (
    <>
      <a className="skip-link" href="#main">
        {t("Skip to content")}
      </a>
      <header
        className={`site-header ${["/mobiles", "/second-hand", "/accessories", "/search"].includes(location.pathname) ? "catalogue-header" : ""}`}
      >
        <div className="container nav-row">
          <Brand />
          <div className="reference-nav-wrap">
            <nav
              id="main-navigation"
              aria-label={t("Main navigation")}
              className={`reference-main-nav ${menu ? "open" : ""}`}
            >
              {links.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMenu(false)}
                >
                  {t(label)}
                </NavLink>
              ))}
            </nav>
          </div>
          <form
            className="shop-header-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <label className="sr-only" htmlFor="header-query">
              {t("Search all products")}
            </label>
            <input
              id="header-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search products…")}
            />
            <button type="submit" aria-label={t("Search the shop")}>
              <Search size={21} />
            </button>
          </form>
          <div className="nav-tools">
            <LanguageSwitch />
            <button
              className="customer-account-link"
              onClick={() => setAccountOpen(true)}
              aria-haspopup="dialog"
              aria-label={customer ? t("My account") : t("Customer login")}
            >
              <UserRound size={22} />
            </button>
            <Link
              to="/cart"
              className="bag-link"
              aria-label={t("Shopping cart, {{v0}} items", {
                v0: String(count),
              })}
            >
              <ShoppingBag size={20} />
              <span>{count}</span>
            </Link>
            <button
              className="icon-button menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? t("Close navigation") : t("Open navigation")}
              aria-expanded={menu}
              aria-controls="main-navigation"
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>
              {t("Your local stop for mobiles,")}
              <br /> {t(" accessories, and repairs.")}
            </p>
            <small>
              © {new Date().getFullYear()} {shop.name}
            </small>
          </div>
          <div>
            <h3>{t("Explore the shop")}</h3>
            {links.slice(1).map(([to, label]) => (
              <Link key={to} to={to}>
                {t(label)}
              </Link>
            ))}
          </div>
          <div>
            <h3>{t("Visit the shop")}</h3>
            <p>
              {t(shop.location)}
              <br />
              {t("Open ")}
              {t(shop.hours)}
              <br />
              {t("Shop pickup only")}
            </p>
            <Link to="/help">
              {t("Contact & location ")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div>
            <h3>{t("Let’s talk.")}</h3>
            <a href={`tel:+${shop.internationalPhone}`}>
              <Phone size={14} />
              {shop.phone}
            </a>
            <a href={whatsapp()} target="_blank" rel="noreferrer">
              {t("Message on WhatsApp ")}
              <ArrowUpRight size={14} />
            </a>
            <p className="footer-note">
              {t("Facebook · Instagram · TikTok")}
              <br />
              {t("Links coming later")}
            </p>
          </div>
        </div>
      </footer>
      <nav className="mobile-dock" aria-label={t("Quick navigation")}>
        <NavLink to="/" end>
          <HomeIcon size={21} />
          <span>{t("Home")}</span>
        </NavLink>
        <NavLink
          to="/mobiles"
          className={({ isActive }) =>
            isActive || (shoppingPage && location.pathname !== "/")
              ? "active"
              : undefined
          }
        >
          <Smartphone size={21} />
          <span>{t("Shop")}</span>
        </NavLink>
        <NavLink
          to="/cart"
          className={({ isActive }) =>
            isActive ||
            location.pathname === "/checkout" ||
            location.pathname.startsWith("/order/")
              ? "dock-bag active"
              : "dock-bag"
          }
        >
          <ShoppingBag size={21} />
          <span>
            {t("Cart")}
            {count > 0 ? ` (${count})` : ""}
          </span>
        </NavLink>
        <button
          onClick={() => setAccountOpen(true)}
          aria-haspopup="dialog"
          className={
            accountOpen ||
            ["/account", "/login", "/my-orders"].includes(location.pathname)
              ? "active"
              : ""
          }
        >
          <UserRound size={21} />
          <span>{t("Account")}</span>
        </button>
        <a
          href={whatsapp()}
          target="_blank"
          rel="noreferrer"
          aria-label={t("Chat with shop on WhatsApp")}
        >
          <WhatsAppIcon size={24} />
        </a>
      </nav>
      <a
        className="floating-whatsapp"
        href={whatsapp()}
        target="_blank"
        rel="noreferrer"
        aria-label={t("Contact shop on WhatsApp")}
      >
        <WhatsAppIcon size={25} />
      </a>
      {notice && (
        <div className="toast" role="status">
          {t(notice)}
          <button onClick={dismiss} aria-label={t("Dismiss notification")}>
            <X size={17} />
          </button>
        </div>
      )}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
    </>
  );
}
