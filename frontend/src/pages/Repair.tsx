import { useT } from "../context/LanguageContext";
import Services from "./Services";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../utils/api";
import CustomerRepairs from "../components/CustomerRepairs";
import CustomerRepairRequest from "../components/CustomerRepairRequest";

export default function Repair() {
  const t = useT();
  const [reference, setReference] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<{ id: string; device: string; status: string; history: { status: string; date: string; message?: string }[]; diagnosis?: string; estimatedCost?: number | null; finalCost?: number | null; approval?: string; customerUpdate?: string } | null>(null);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  async function trackValues(nextReference: string, nextCode: string) {
    setError(""); setTicket(null);
    try { setTicket((await api<{ ticket: typeof ticket }>(`/repairs/${encodeURIComponent(nextReference.trim().toUpperCase())}`, { headers: { "X-Repair-Token": nextCode.trim() } })).ticket); }
    catch { setError("Repair ticket not found. Check the reference and tracking code."); }
  }
  useEffect(() => {
    const nextReference = searchParams.get("reference") || "";
    const nextCode = searchParams.get("token") || "";
    if (nextReference && nextCode) { setReference(nextReference); setCode(nextCode); void trackValues(nextReference, nextCode); }
  }, [searchParams]);
  async function track(event: FormEvent) { event.preventDefault(); await trackValues(reference, code); }
  async function decide(decision: "APPROVED" | "DECLINED") {
    if (!ticket) return;
    try { const response = await api<{ ticket: typeof ticket }>(`/repairs/${encodeURIComponent(ticket.id)}/decision`, { method: "POST", headers: { "X-Repair-Token": code.trim() }, body: JSON.stringify({ decision }) }); setTicket(response.ticket); }
    catch { setError(t("Could not update repair approval.")); }
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
        <CustomerRepairRequest />
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
        {ticket && <div className="repair-status-card"><strong>{ticket.id} · {ticket.device}</strong><p>{t(ticket.status)}</p>{ticket.diagnosis && <p><strong>{t("Diagnosis")}:</strong> {ticket.diagnosis}</p>}{ticket.estimatedCost != null && <p><strong>{t("Estimated cost")}:</strong> Rs. {ticket.estimatedCost.toLocaleString()}</p>}{ticket.finalCost != null && <p><strong>{t("Final cost")}:</strong> Rs. {ticket.finalCost.toLocaleString()}</p>}{ticket.customerUpdate && <p>{ticket.customerUpdate}</p>}{ticket.approval === "PENDING" && <div className="button-row"><button className="button dark" type="button" onClick={() => void decide("APPROVED")}>{t("Approve repair")}</button><button className="button white" type="button" onClick={() => void decide("DECLINED")}>{t("Decline repair")}</button></div>}<ol>{ticket.history.map((event, index) => <li key={index}>{t(event.status)} · {new Date(event.date).toLocaleDateString()} {event.message ? `· ${event.message}` : ""}</li>)}</ol></div>}
        </details>
      </section>
    </>
  );
}
