import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useProducts } from "../context/ProductContext";

export default function ReferenceHome() {
  const { products } = useProducts();
  return (
    <>
      <div className="container reference-promos">
        <section className="hero reference-banner-main">
          <img
            className="reference-banner-photo"
            src="/assets/shop-banner-v1.png"
            alt="Phones and earbuds in a studio setting"
            fetchPriority="high"
          />
          <div className="hero-copy">
            <span className="eyebrow">Machhapuchhree Electronics</span>
            <h1>
              Find your
              <br />
              <span>next phone.</span>
            </h1>
            <p>
              New and second-hand phones, accessories and friendly help. Visit
              us in Lekhnath.
            </p>
            <Link className="button dark" to="/mobiles">
              Shop new phones <ArrowRight size={17} />
            </Link>
          </div>
        </section>
        <div className="reference-side-promos">
          <Link className="reference-promo accessory-promo" to="/accessories">
            <img
              src="/assets/accessories-banner-v1.png"
              alt="Headphones, earbuds and a charger"
            />
            <div>
              <span>Everyday essentials</span>
              <h2>Accessories</h2>
              <strong>
                Shop now <ArrowRight size={16} />
              </strong>
            </div>
          </Link>
          <Link className="reference-promo used-phone-promo" to="/second-hand">
            <img src="/assets/shop-banner-v1.png" alt="Phones and earbuds" />
            <div>
              <span>More options for your budget</span>
              <h2>Used phones</h2>
              <strong>
                Explore phones <ArrowRight size={16} />
              </strong>
            </div>
          </Link>
        </div>
      </div>
      <div
        className="container reference-budget-row"
        aria-label="Browse phones by budget"
      >
        {[20000, 35000, 50000, 70000]
          .filter((price) =>
            products.some(
              (product) => product.category === "new" && product.price <= price,
            ),
          )
          .slice(0, 3)
          .map((price) => (
            <Link key={price} to={`/mobiles?budget=${price}`}>
              Under Rs. {price.toLocaleString("en-IN")} <ArrowRight size={15} />
            </Link>
          ))}
      </div>
    </>
  );
}
