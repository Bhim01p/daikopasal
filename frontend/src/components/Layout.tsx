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
  ["/contact", "Contact & Help"],
  ["/my-orders", "My orders"],
];
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label={`${shop.name} home`}>
      <Mountain size={33} />
      <span>
        {shop.name.replace(/\s+Electronics$/i, "")}
        <small>ELECTRONICS</small>
      </span>
    </Link>
  );
}
export default function Layout() {
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
        Skip to content
      </a>
      <div className="top-bar">
        <div className="container">
          <span>
            {shop.location}{" "}
            <span className="top-divider">· Open {shop.hours}</span>
          </span>
          <a href={`tel:+${shop.internationalPhone}`}>
            <Phone size={15} /> {shop.phone}
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="container nav-row">
          <Brand />
          <div className="reference-nav-wrap">
            <nav
              id="main-navigation"
              aria-label="Main navigation"
              className={`reference-main-nav ${menu ? "open" : ""}`}
            >
              {links.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMenu(false)}
                >
                  {label}
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
              Search all products
            </label>
            <input
              id="header-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products…"
            />
            <button type="submit" aria-label="Search the shop">
              <Search size={21} />
            </button>
          </form>
          <div className="nav-tools">
            <button
              className="customer-account-link"
              onClick={() => setAccountOpen(true)}
              aria-haspopup="dialog"
              aria-label={customer ? "My account" : "Customer login"}
            >
              <UserRound size={22} />
            </button>
            <Link
              to="/cart"
              className="bag-link"
              aria-label={`Shopping bag, ${count} items`}
            >
              <ShoppingBag size={20} />
              <span>{count}</span>
            </Link>
            <button
              className="icon-button menu-button"
              onClick={() => setMenu(!menu)}
              aria-label={menu ? "Close navigation" : "Open navigation"}
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
              Your local stop for mobiles,
              <br /> accessories, and repairs.
            </p>
            <small>
              © {new Date().getFullYear()} {shop.name}
            </small>
          </div>
          <div>
            <h3>Explore the shop</h3>
            {links.slice(1).map(([to, label]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h3>Visit the shop</h3>
            <p>
              {shop.location}
              <br />
              Open {shop.hours}
              <br />
              Shop pickup only
            </p>
            <Link to="/contact">
              Contact & location <ArrowUpRight size={14} />
            </Link>
          </div>
          <div>
            <h3>Let’s talk.</h3>
            <a href={`tel:+${shop.internationalPhone}`}>
              <Phone size={14} />
              {shop.phone}
            </a>
            <a href={whatsapp()} target="_blank" rel="noreferrer">
              Message on WhatsApp <ArrowUpRight size={14} />
            </a>
            <p className="footer-note">
              Facebook · Instagram · TikTok
              <br />
              Links coming later
            </p>
          </div>
        </div>
      </footer>
      <nav className="mobile-dock" aria-label="Quick navigation">
        <NavLink to="/" end>
          <HomeIcon size={21} />
          <span>Home</span>
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
          <span>Shop</span>
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
          <span>Bag{count > 0 ? ` (${count})` : ""}</span>
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
          <span>Account</span>
        </button>
        <a
          href={whatsapp()}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with shop on WhatsApp"
        >
          <WhatsAppIcon size={24} />
        </a>
      </nav>
      <a
        className="floating-whatsapp"
        href={whatsapp()}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact shop on WhatsApp"
      >
        <WhatsAppIcon size={25} />
      </a>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={dismiss} aria-label="Dismiss notification">
            <X size={17} />
          </button>
        </div>
      )}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
    </>
  );
}
