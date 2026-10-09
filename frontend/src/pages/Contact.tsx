import { normalizeDigits } from "../../../shared/locale.mjs";
import { useT } from "../context/LanguageContext";
import { useState, type FormEvent } from "react";
import {
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { shop, shopMap, shopDirections, whatsapp } from "../data/shop";
import WhatsAppIcon from "../components/WhatsAppIcon";
export default function Contact() {
  const t = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
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
      <div className="page-intro">
        <div className="container">
          <h1>{t("Help")}</h1>
          <p>
            {t(
              "A question about a phone, an accessory, or a repair? We’re here to talk.",
            )}
          </p>
        </div>
      </div>
      <div className="container contact-layout">
        <div>
          <h2>{shop.name}</h2>
          <div className="contact-detail">
            <MapPin />
            <div>
              <strong>{t("Find us in Lekhnath")}</strong>
              <p>{shop.address}</p>
            </div>
          </div>
          <div className="contact-detail">
            <Clock />
            <div>
              <strong>{t("Opening hours")}</strong>
              <p>{t(shop.hours)}</p>
            </div>
          </div>
          <div className="contact-detail">
            <Phone />
            <div>
              <strong>{t("Call or WhatsApp")}</strong>
              <p>
                <a href={`tel:+${shop.internationalPhone}`}>{shop.phone}</a>
              </p>
            </div>
          </div>
          <div className="button-row">
            <a className="button dark" href={`tel:+${shop.internationalPhone}`}>
              <Phone size={17} />
              {t("Call now")}
            </a>
            <a
              className="whatsapp-icon-button"
              aria-label={t("Chat with shop on WhatsApp")}
              href={whatsapp()}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
            </a>
          </div>
          <div className="shop-map-card">
            <MapPin size={33} />
            <h3>{t("Visit our store")}</h3>
            <p>
              {t("Find us on Google Maps as ")}
              <strong>{shop.mapName}</strong>.
            </p>
            <div className="button-row">
              <a
                className="button dark"
                href={shopDirections}
                target="_blank"
                rel="noreferrer"
              >
                {t("Get directions ")}
                <ArrowUpRight size={17} />
              </a>
              <a
                className="shop-map-link"
                href={shopMap}
                target="_blank"
                rel="noreferrer"
              >
                {t("View on Google Maps ")}
                <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        </div>
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
            rows={5}
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
      </div>
    </>
  );
}
