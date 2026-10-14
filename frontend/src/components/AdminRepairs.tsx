import { useEffect, useState, type FormEvent } from "react";
import { api } from "../utils/api";
import { useT } from "../context/LanguageContext";

interface Ticket {
  id: string; token: string; claimCode?: string | null; customerId?: string; customerName: string; phone: string; device: string;
  problem: string; status: string; createdAt: string;
}
const steps = ["Received", "Inspecting", "Awaiting approval", "Repairing", "Ready", "Collected", "Cancelled"];
export default function AdminRepairs() {
  const t = useT();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [draft, setDraft] = useState({ customerName: "", phone: "", device: "", problem: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => setTickets((await api<{ tickets: Ticket[] }>("/admin/repairs")).tickets);
  useEffect(() => { void load().catch((error) => setError(error.message)); }, []);
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/admin/repairs", { method: "POST", body: JSON.stringify(draft) });
      await load(); setDraft({ customerName: "", phone: "", device: "", problem: "" });
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save repair ticket."); }
    finally { setBusy(false); }
  }
  async function update(ticket: Ticket, status: string) {
    setBusy(true); setError("");
    try { await api(`/admin/repairs/${ticket.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not update repair ticket."); }
    finally { setBusy(false); }
  }
  async function renewCode(ticket: Ticket) {
    setBusy(true); setError("");
    try { await api(`/admin/repairs/${ticket.id}/code`, { method: "POST", body: "{}" }); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not create repair code."); }
    finally { setBusy(false); }
  }
  return <section className="admin-panel repair-admin-panel">
    <h2>{t("Repair tickets")}</h2>
    <p>{t("Record a device left at the shop, then update its repair stage.")}</p>
    <form className="repair-ticket-form" onSubmit={(event) => void create(event)}>
      <label>{t("Customer name")}<input required minLength={2} maxLength={100} value={draft.customerName} onChange={(event) => setDraft({ ...draft, customerName: event.target.value })} /></label>
      <label>{t("Phone")}<input required inputMode="tel" minLength={10} maxLength={20} value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
      <label>{t("Device or vehicle model")}<input required minLength={2} maxLength={120} value={draft.device} onChange={(event) => setDraft({ ...draft, device: event.target.value })} /></label>
      <label>{t("Reported problem")}<textarea required minLength={2} maxLength={1000} value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} /></label>
      <button className="button dark" disabled={busy}>{t("Create repair ticket")}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="repair-ticket-list">
      {tickets.map((ticket) => <article key={ticket.id}>
        <div><strong>{ticket.id}</strong><span>{ticket.customerName} · {ticket.phone}</span></div>
        <p>{ticket.device}: {ticket.problem}</p>
        <label>{t("Status")}
          <select disabled={busy || ["Collected", "Cancelled"].includes(ticket.status)} value={ticket.status} onChange={(event) => void update(ticket, event.target.value)}>
            {steps.map((step) => <option key={step} value={step}>{t(step)}</option>)}
          </select>
        </label>
        {ticket.customerId ? <p className="summary-note">{t("Linked to customer account")}</p> : <>
          {ticket.claimCode && <p className="summary-note">{t("Give this six-digit code to the customer")}: <strong><code>{ticket.claimCode}</code></strong></p>}
          <button className="button white" type="button" disabled={busy} onClick={() => void renewCode(ticket)}>{t(ticket.claimCode ? "Generate a new code" : "Generate claim code")}</button>
        </>}
      </article>)}
    </div>
  </section>;
}
