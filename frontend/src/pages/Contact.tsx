import { Link } from "react-router-dom";
import { useCustomer } from "../context/CustomerContext";
import CancellationPolicy from "../components/CancellationPolicy";
import { Package, ChevronRight } from "lucide-react";
import { normalizeDigits } from "../../../shared/locale.mjs";
import { useT } from "../context/LanguageContext";
import { useEffect, useState, type FormEvent } from "react";
import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { shop, shopMap, shopMapEmbed, shopDirections, whatsapp } from "../data/shop";
import WhatsAppIcon from "../components/WhatsAppIcon";
export default function Contact() {
  const t = useT();
  const { customer } = useCustomer();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone);
    }
  }, [customer?.id]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (
      name.trim().length < 2 ||
      !message.trim() ||
      !/^(?:\+977|977)?9[78]\d{8}$/.test(
        normalizeDigits(phone).replace(/[\s()-]/g, ""),
      )
    ) {
      setError(
        "Please enter your name, a valid Nepal mobile number, and a message.",
      );
      setDraft("");
      return;
    }
    setError("");
    setDraft(
      whatsapp(
        `Hello ${shop.name},\nName: ${name.trim()}\nPhone: ${phone.trim()}\n\n${message.trim()}`,
      ),
    );
  }
  return (
    <>
      <div className="container help-page">
        <div className="help-heading">
          <span className="eyebrow">{t("Help")}</span>
          <h1>{t("How can we help?")}</h1>
          <p>{t("Quick answers and friendly help from your local shop.")}</p>
        </div>
        <div className="help-quick-actions">
          <Link className="help-action" to="/my-orders">
            <Package />
            <h2>{t("Track my order")}</h2>
            <p>{t("See your latest pickup status.")}</p>
            <ChevronRight />
          </Link>
          <a
            className="help-action whatsapp-action"
            href={whatsapp()}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
            <h2>{t("Chat on WhatsApp")}</h2>
            <p>{t("Ask us about a product or order.")}</p>
            <ChevronRight />
          </a>
          <a
            className="help-action call-action"
            href={`tel:+${shop.internationalPhone}`}
          >
            <Phone />
            <h2>{t("Call the shop")}</h2>
            <p>
              {shop.phone} · {t(shop.hours)}
            </p>
            <ChevronRight />
          </a>
        </div>
        <section className="help-store">
          <div>
            <h2>
              <MapPin size={23} /> {t("Visit our store")}
            </h2>
            <p>{shop.address}</p>
            <p>
              <Clock size={17} /> {t("Opening hours")}: {t(shop.hours)}
            </p>
            <p className="summary-note">
              {t("Find us on Google Maps as ")}
              <strong>{shop.mapName}</strong>
            </p>
          </div>
          <div className="button-row">
            <a
              className="button dark"
              href={shopDirections}
              target="_blank"
              rel="noreferrer"
            >
              {t("Get directions")} <ArrowUpRight size={17} />
            </a>
            <a
              className="text-link"
              href={shopMap}
              target="_blank"
              rel="noreferrer"
            >
              {t("View on Google Maps")} <ArrowUpRight size={17} />
            </a>
          </div>
          <iframe className="shop-map-embed" src={shopMapEmbed} title={t("Shop location map")} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </section>
        <section className="help-faq">
          <h2>{t("Common questions")}</h2>
          <details>
            <summary>{t("Do you offer delivery?")}</summary>
            <p>
              {t(
                "Orders are for shop pickup only. Collect from our Lekhnath store between 8 AM and 6 PM.",
              )}
            </p>
          </details>
          <details>
            <summary>{t("When should I collect my order?")}</summary>
            <p>
              {t(
                "Wait for your ready-for-pickup notification before visiting. Bring your order reference when collecting.",
              )}
            </p>
          </details>
          <details>
            <summary>{t("How do I receive order updates?")}</summary>
            <p>
              {t(
                "Order confirmation and status updates go to the email address entered at checkout. You can also track your order on this website.",
              )}
            </p>
            <Link className="text-link" to="/my-orders">
              {t("Track my order")}
            </Link>
          </details>
          <details>
            <summary>{t("Can I cancel my order?")}</summary>
            <CancellationPolicy />
          </details>
          <details>
            <summary>{t("Need a repair?")}</summary>
            <p>
              {t(
                "Tell us your device or vehicle model and the issue. Parts, cost and timing are confirmed after inspection.",
              )}
            </p>
            <Link className="text-link" to="/repair">
              {t("Repair")}
            </Link>
          </details>
        </section>
        <details className="help-enquiry">
          <summary>{t("Ask a question")}</summary>
          <form className="contact-form" onSubmit={submit} noValidate>
            <h2>{t("What’s on your mind?")}</h2>
            <p>{t("Fill in your details to prepare a WhatsApp message.")}</p>
            <label htmlFor="contact-name">{t("Name *")}</label>
            <input
              id="contact-name"
              autoComplete="name"
              required
              value={name}
              maxLength={100}
              onChange={(e) => {
                setName(e.target.value);
                setDraft("");
              }}
            />
            <label htmlFor="contact-phone">{t("Phone *")}</label>
            <input
              id="contact-phone"
              autoComplete="tel"
              type="tel"
              required
              value={phone}
              maxLength={20}
              onChange={(e) => {
                setPhone(e.target.value);
                setDraft("");
              }}
            />
            <label htmlFor="contact-message">{t("Message *")}</label>
            <textarea
              id="contact-message"
              rows={3}
              required
              value={message}
              maxLength={2000}
              onChange={(e) => {
                setMessage(e.target.value);
                setDraft("");
              }}
            />
            {error && (
              <p className="field-error" role="alert">
                {t(error)}
              </p>
            )}
            <button className="button dark" type="submit">
              {t("Prepare WhatsApp message ")}
              <ArrowUpRight size={17} />
            </button>
            {draft && (
              <div className="prepared-message" role="status">
                <p>
                  {t(
                    "Your message is ready. Open WhatsApp, review it, and send it to the shop.",
                  )}
                </p>
                <a
                  className="button teal"
                  href={draft}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={17} />
                  {t("Open WhatsApp")}
                </a>
              </div>
            )}
            <p className="privacy-note">
              {t(
                "This form prepares a message. Nothing is sent until you send it in WhatsApp.",
              )}
            </p>
          </form>
        </details>
      </div>
    </>
  );
}
