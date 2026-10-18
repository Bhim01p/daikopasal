import { useT } from "../context/LanguageContext";
import { LanguageSwitch } from "../context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Clock,
  MapPin,
  Heart,
  ChevronDown,
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
import { shop, shopDirections, whatsapp } from "../data/shop";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { useFavourites } from "../context/FavouritesContext";
import HeaderDropdown from "./HeaderDropdown";
import AccountDialog from "./AccountDialog";
import CartDialog from "./CartDialog";
import WhatsAppIcon from "./WhatsAppIcon";
import { ThemeSwitch } from "../context/ThemeContext";
const searchHistoryKey = "me-search-history-v1";
function readSearchHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(searchHistoryKey) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  } catch { return []; }
}
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
      <img
        className="brand-logo"
        src="/assets/logo.png"
        alt={shop.name}
        width="52"
        height="52"
      />
      <span>
        {shop.name.replace(/\s+Electronics$/i, "")}
        <small>{t("ELECTRONICS")}</small>
      </span>
    </Link>
  );
}
export default function Layout() {
  const t = useT();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--site-header-height",
        (header.current?.getBoundingClientRect().height || 84) + "px",
      ),
    );
    if (header.current) observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  const { ids: favouriteIds } = useFavourites();
  const { customer } = useCustomer();
  const { count, notice, dismiss } = useCart();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>(readSearchHistory);
  const [searchFocused, setSearchFocused] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const shoppingPage =
    [
      "/",
      "/shop",
      "/mobiles",
      "/second-hand",
      "/accessories",
      "/search",
    ].includes(location.pathname) || location.pathname.startsWith("/product/");
  useEffect(() => {
    const keepsSearch = ["/search", "/mobiles", "/second-hand", "/accessories"].includes(location.pathname);
    const nextQuery = keepsSearch ? new URLSearchParams(location.search).get("q") || "" : "";
    setQuery(nextQuery);
  }, [location.pathname, location.search]);
  useEffect(() => {
    setMenu(false);
    setAccountOpen(false);
    const section = location.hash
      ? document.getElementById(location.hash.slice(1))
      : null;
    if (section) section.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.hash]);
  const showFloatingActions =
    !accountOpen &&
    !["/login", "/account", "/cart", "/checkout"].includes(location.pathname) &&
    !location.pathname.startsWith("/order/");
  const showSearch = shoppingPage;
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
        ref={header}
        className={`site-header ${["/mobiles", "/second-hand", "/accessories", "/search"].includes(location.pathname) ? "catalogue-header" : ""} ${!showSearch ? "non-shopping-header" : ""}`}
      >
        <div className="container nav-row">
          <Brand />
          <div className="reference-nav-wrap">
            <nav
              id="main-navigation"
              aria-label={t("Main navigation")}
              className={`reference-main-nav ${menu ? "open" : ""}`}
            >
              <NavLink to="/" end>
                {t("Home")}
              </NavLink>
              <HeaderDropdown
                label={t("Shop")}
                trigger={
                  <>
                    {t("Shop")} <ChevronDown size={15} />
                  </>
                }
                triggerClass={
                  shoppingPage && location.pathname !== "/"
                    ? "shop-menu active"
                    : "shop-menu"
                }
              >
                {links.slice(1, 4).map(([to, label]) => (
                  <NavLink key={to} to={to}>
                    {t(label)}
                  </NavLink>
                ))}
              </HeaderDropdown>
              <NavLink to="/compare">{t("Compare")}</NavLink>
              <NavLink to="/favourites" className="mobile-favourites-link">
                {t("Favourites")}
              </NavLink>
              <NavLink to="/help">{t("Help")}</NavLink>
              <NavLink to="/repair">{t("Repair")}</NavLink>
              <div className="mobile-menu-preferences">
                <LanguageSwitch />
                <ThemeSwitch />
              </div>
            </nav>
          </div>
          {showSearch && (
            <form
              className="shop-header-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const value = query.trim();
                setSearchFocused(false);
                if (!value) {
                  navigate("/search");
                  return;
                }
                const nextHistory = [value, ...searchHistory.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
                setSearchHistory(nextHistory);
                try { localStorage.setItem(searchHistoryKey, JSON.stringify(nextHistory)); } catch { /* optional cache */ }
                navigate(`/search?q=${encodeURIComponent(value)}`);
              }}
            >
              <label className="sr-only" htmlFor="header-query">
                {t("Search all products")}
              </label>
              <input
                id="header-query"
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  if (location.pathname === "/search") {
                    navigate(value.trim() ? `/search?q=${encodeURIComponent(value)}` : "/search", { replace: true });
                  }
                }}
                placeholder={t("Search products…")}
              />
              <button type="submit" aria-label={t("Search the shop")}>
                <Search size={21} />
              </button>
              {searchFocused && searchHistory.length > 0 && <div className="search-history" onMouseLeave={() => setSearchFocused(false)}>
                <div className="search-history-heading"><strong>{t("Recent searches")}</strong><button type="button" onClick={() => { setSearchHistory([]); localStorage.removeItem(searchHistoryKey); }}>{t("Clear all")}</button></div>
                {searchHistory.map((item) => <div className="search-history-item" key={item}><button type="button" onClick={() => { setQuery(item); setSearchFocused(false); navigate(`/search?q=${encodeURIComponent(item)}`); }}>{item}</button><button type="button" aria-label={t("Delete search {{v0}}", { v0: item })} onClick={() => { const next = searchHistory.filter((entry) => entry !== item); setSearchHistory(next); localStorage.setItem(searchHistoryKey, JSON.stringify(next)); }}><X size={14} /></button></div>)}
              </div>}
            </form>
          )}
          <div className="nav-tools">
            <LanguageSwitch />
            <ThemeSwitch />
            <Link
              to="/favourites"
              className="header-favourites"
              aria-label={t("Favourites")}
            >
              <Heart size={20} />
              <span>{favouriteIds.length}</span>
            </Link>
            <HeaderDropdown
              label={t("Account")}
              trigger={
                customer?.photo ? (
                  <img
                    className="customer-avatar"
                    src={customer.photo}
                    alt={t("Profile photo")}
                  />
                ) : (
                  <UserRound size={22} />
                )
              }
              triggerClass="customer-account-link"
              className="account-dropdown"
            >
              <button
                onClick={() => {
                  setAccountOpen(true);
                }}
              >
                {customer ? t("My account") : t("Customer login")}
              </button>
              <Link to="/my-orders">{t("My orders")}</Link>
            </HeaderDropdown>
            <button
              type="button"
              onClick={() => { setAccountOpen(false); setCartOpen(true); }}
              className="bag-link"
              aria-label={t("Shopping cart, {{v0}} items", {
                v0: String(count),
              })}
            >
              <ShoppingBag size={20} />
              <span key={count} className="cart-count-badge">{count}</span>
            </button>
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
            <p className="footer-shop-hours">{t("Open ")}{t(shop.hours)}</p>
            <p className="footer-shop-address">{t(shop.location)}</p>
            <small>
              © {new Date().getFullYear()} {shop.name}
            </small>
          </div>
          <div>
            <h3>{t("Explore the shop")}</h3>
            {links.slice(1).filter(([, label]) => label !== "My orders").map(([to, label]) => (
              <Link key={to} to={to}>
                {t(label)}
              </Link>
            ))}
          </div>
          <div>
            <h3>{t("Let’s talk.")}</h3>
            <a href={`tel:+${shop.internationalPhone}`}>
              <Phone size={14} />
              {shop.phone}
            </a>
            <a href={whatsapp()} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={17} />
              {t("WhatsApp ")}
              <ArrowUpRight size={14} />
            </a>
            <p className="footer-note">
              <span className="footer-social-links">
                <a href="https://www.facebook.com/share/1ErPWxDyZK/" target="_blank" rel="noreferrer"><span className="social-mark facebook-mark">f</span>Facebook</a>
                <a href="https://www.tiktok.com/@snake_siddhartha?_r=1&_t=ZS-9AYFE49MZk2" target="_blank" rel="noreferrer"><span className="social-mark tiktok-mark">♪</span>TikTok</a>
              </span>
            </p>
          </div>
        </div>
        <div className="container mobile-compact-footer">
          <div className="mobile-footer-brand">
            <Brand />
            <a
              className="mobile-footer-whatsapp"
              href={whatsapp()}
              target="_blank"
              rel="noreferrer"
              aria-label={t("Contact shop on WhatsApp")}
            >
              <WhatsAppIcon size={22} />
            </a>
          </div>
          <div className="mobile-footer-facts">
            <a href={`tel:+${shop.internationalPhone}`}>
              <Phone size={17} />
              <span>
                <small>{t("Call the shop")}</small>
                <strong>{shop.phone}</strong>
              </span>
            </a>
            <div>
              <Clock size={17} />
              <span>
                <small>{t("Opening hours")}</small>
                <strong>{t(shop.hours)}</strong>
              </span>
            </div>
          </div>
          <a
            className="mobile-footer-directions"
            href={shopDirections}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={17} />
            {t("Get directions")}
            <ArrowUpRight size={16} />
          </a>
          <details className="mobile-footer-section">
            <summary>
              {t("Explore the shop")}
              <ChevronDown size={17} />
            </summary>
            <div className="mobile-footer-links">
              {links.slice(1, 4).map(([to, label]) => (
                <Link key={to} to={to}>
                  {t(label)}
                </Link>
              ))}
              <Link to="/compare">{t("Compare")}</Link>
              <Link to="/favourites">{t("Favourites")}</Link>
              <Link to="/my-orders">{t("My orders")}</Link>
            </div>
          </details>
          <details className="mobile-footer-section">
            <summary>
              {t("Help & store information")}
              <ChevronDown size={17} />
            </summary>
            <p>
              {shop.address}
              <br />
              {t("Shop pickup only")}
            </p>
            <div className="mobile-footer-links">
              <Link to="/help">{t("Help")}</Link>
              <Link to="/repair">{t("Repair")}</Link>
            </div>
          </details>
          <small className="mobile-footer-copyright">
            © {new Date().getFullYear()} {shop.name}
          </small>
        </div>
      </footer>
      <nav className="mobile-dock" aria-label={t("Quick navigation")}>
        <NavLink to="/" end>
          <HomeIcon size={21} />
          <span>{t("Home")}</span>
        </NavLink>
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            isActive || (shoppingPage && location.pathname !== "/")
              ? "active"
              : undefined
          }
        >
          <Smartphone size={21} />
          <span>{t("Shop")}</span>
        </NavLink>
        <NavLink to="/favourites">
          <Heart size={21} />
          <span>
            {t("Favourites")}
            {favouriteIds.length ? ` (${favouriteIds.length})` : ""}
          </span>
        </NavLink>
        <button
          onClick={() => {
            setAccountOpen(false);
            navigate(customer ? "/account" : "/login?next=/account");
          }}
          aria-haspopup="dialog"
          className={
            accountOpen ||
            ["/account", "/login", "/my-orders"].includes(location.pathname)
              ? "active"
              : ""
          }
        >
          {customer?.photo ? (
            <img className="customer-avatar" src={customer.photo} alt="" />
          ) : (
            <UserRound size={21} />
          )}
          <span>{t("Account")}</span>
        </button>
      </nav>
      {showFloatingActions && (
        <div className="shopping-floating-actions">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="floating-cart"
            aria-label={t("Shopping cart, {{v0}} items", { v0: String(count) })}
          >
            <ShoppingBag size={24} />
            <span key={count} className="cart-count-badge">{count}</span>
          </button>
          <a
            className="floating-whatsapp"
            href={whatsapp()}
            target="_blank"
            rel="noreferrer"
            aria-label={t("Contact shop on WhatsApp")}
          >
            <WhatsAppIcon size={25} />
          </a>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {t(notice)}
          <button onClick={dismiss} aria-label={t("Dismiss notification")}>
            <X size={17} />
          </button>
        </div>
      )}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
      {cartOpen && <CartDialog onClose={() => setCartOpen(false)} />}
    </>
  );
}
