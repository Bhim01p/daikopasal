import { useT } from "../context/LanguageContext";
import Services from "./Services";
import { useState, type FormEvent } from "react";
import { api } from "../utils/api";
import CustomerRepairs from "../components/CustomerRepairs";

export default function Repair() {
  const t = useT();
  const [reference, setReference] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<{ id: string; device: string; status: string; history: { status: string; date: string }[] } | null>(null);
  const [error, setError] = useState("");
  async function track(event: FormEvent) {
    event.preventDefault(); setError(""); setTicket(null);
    try { setTicket((await api<{ ticket: typeof ticket }>(`/repairs/${encodeURIComponent(reference.trim().toUpperCase())}`, { headers: { "X-Repair-Token": code.trim() } })).ticket); }
    catch { setError("Repair ticket not found. Check the reference and tracking code."); }
  }
  return (
    <>
      <div className="page-intro">
        <div className="container">
          <h1>{t("Repair")}</h1>
          <p>
            {t(
              "Phone and digital meter repair enquiries, with friendly help from our shop.",
            )}
          </p>
        </div>
      </div>
      <Services />
      <section className="container repair-tracking">
        <CustomerRepairs />
        <details className="legacy-repair-tracking"><summary>{t("Have an older tracking code?")}</summary>
        <h2>{t("Track a repair")}</h2>
        <p>{t("Use the ticket reference and private tracking code given by the shop.")}</p>
        <form onSubmit={(event) => void track(event)}>
          <label>{t("Ticket reference")}<input required value={reference} onChange={(event) => setReference(event.target.value)} /></label>
          <label>{t("Tracking code")}<input required value={code} onChange={(event) => setCode(event.target.value)} /></label>
          <button className="button dark">{t("Check status")}</button>
        </form>
        {error && <p role="alert">{t(error)}</p>}
        {ticket && <div className="repair-status-card"><strong>{ticket.id} · {ticket.device}</strong><p>{t(ticket.status)}</p><ol>{ticket.history.map((event, index) => <li key={index}>{t(event.status)} · {new Date(event.date).toLocaleDateString()}</li>)}</ol></div>}
        </details>
      </section>
    </>
  );
}
