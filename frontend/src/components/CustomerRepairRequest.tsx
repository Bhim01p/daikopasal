import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useT } from "../context/LanguageContext";
import { api } from "../utils/api";
import { whatsapp } from "../data/shop";

type RequestResult = { ticket: { id: string; device: string; problem: string; status: string }; trackingToken: string };
const categories = ["screen", "battery", "charging", "camera", "audio", "software", "network", "buttons", "water", "meter", "other"];

export default function CustomerRepairRequest() {
  const t = useT();
  const [form, setForm] = useState({ deviceType: "mobile", brand: "", model: "", issueCategory: "", description: "", customerName: "", phone: "", whatsapp: "", whatsappSameAsPhone: true, preferredContact: "call" });
  const [result, setResult] = useState<RequestResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { setResult(await api<RequestResult>("/repairs", { method: "POST", body: JSON.stringify(form) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("Could not submit repair request.")); }
    finally { setBusy(false); }
  }
  if (result) return <section className="customer-repair-request repair-success" aria-live="polite">
    <h2>{t("Repair Request Received")}</h2>
    <p><strong>{t("Repair ID")}: {result.ticket.id}</strong></p>
    <p>{result.ticket.device}</p><p>{t(result.ticket.problem)}</p>
    <div className="repair-current-status"><small>{t("Status")}</small><strong>{t(result.ticket.status)}</strong></div>
    <p>{t("We'll contact you after reviewing your request.")}</p>
    <p>{t("Bring your device to Machhapuchhree Electronics for inspection.")}</p>
    <p>{t("Final repair cost will be confirmed after inspection.")}</p>
    <div className="button-row"><Link className="button dark" to={`/repair?reference=${encodeURIComponent(result.ticket.id)}&token=${encodeURIComponent(result.trackingToken)}`}>{t("Track Repair")}</Link><a className="button white" href={whatsapp(t("Hello, I submitted a repair request and need help."))} target="_blank" rel="noreferrer">{t("WhatsApp Us")}</a></div>
  </section>;
  return <section className="customer-repair-request">
    <h2>{t("Request a repair")}</h2><p>{t("Tell us what device needs attention. Bring it to the shop for inspection; no login is required.")}</p>
    <form onSubmit={(event) => void submit(event)}>
      <label>{t("Device type")}<select required value={form.deviceType} onChange={(event) => update("deviceType", event.target.value)}><option value="mobile">{t("Mobile Phone")}</option><option value="meter">{t("Digital Meter")}</option></select></label>
      <div className="repair-request-grid"><label>{t("Brand or device maker")}<input required minLength={1} maxLength={60} value={form.brand} onChange={(event) => update("brand", event.target.value)} /></label><label>{form.deviceType === "meter" ? t("Vehicle/bike model") : t("Model")}<input required minLength={2} maxLength={120} value={form.model} onChange={(event) => update("model", event.target.value)} /></label></div>
      <label>{t("What is wrong?")}<select required value={form.issueCategory} onChange={(event) => update("issueCategory", event.target.value)}><option value="" disabled>{t("Choose a problem")}</option>{categories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select></label>
      <label>{t("Short description (optional)")}<textarea maxLength={500} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={t("Example: Touch sometimes does not work.")} /></label>
      <div className="repair-request-grid"><label>{t("Full name")}<input required minLength={2} maxLength={100} autoComplete="name" value={form.customerName} onChange={(event) => update("customerName", event.target.value)} /></label><label>{t("Phone number")}<input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label></div>
      <label><span>{t("WhatsApp number (optional)")}</span><input disabled={form.whatsappSameAsPhone} inputMode="tel" value={form.whatsappSameAsPhone ? form.phone : form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} /></label>
      <label className="repair-checkbox"><input type="checkbox" checked={form.whatsappSameAsPhone} onChange={(event) => update("whatsappSameAsPhone", event.target.checked)} /> {t("Same as phone")}</label>
      <fieldset><legend>{t("Preferred contact")}</legend><label><input type="radio" name="preferred-contact" value="call" checked={form.preferredContact === "call"} onChange={(event) => update("preferredContact", event.target.value)} /> {t("Call")}</label><label><input type="radio" name="preferred-contact" value="whatsapp" checked={form.preferredContact === "whatsapp"} onChange={(event) => update("preferredContact", event.target.value)} /> {t("WhatsApp")}</label></fieldset>
      <p className="summary-note">{t("Final repair cost will be confirmed after inspection. Bring the device to the shop.")}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button dark" disabled={busy}>{busy ? t("Submitting…") : t("Submit Repair Request")}</button>
    </form>
  </section>;
}
