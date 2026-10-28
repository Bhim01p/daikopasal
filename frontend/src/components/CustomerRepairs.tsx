import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useCustomer } from "../context/CustomerContext";
import { useT } from "../context/LanguageContext";
import { api } from "../utils/api";

interface RepairTicket {
  id: string;
  device: string;
  status: string;
  history: { status: string; date: string }[];
}

export default function CustomerRepairs() {
  const { customer } = useCustomer();
  const t = useT();
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPhone(customer?.phone || "");
  }, [customer?.id, customer?.phone]);
  useEffect(() => {
    if (!customer) {
      setTickets([]);
      return;
    }
    void api<{ tickets: RepairTicket[] }>("/customer/repairs")
      .then((result) => setTickets(result.tickets))
      .catch(() => setError("Could not load your repairs."));
  }, [customer?.id]);
  async function claim(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/customer/repairs/claim", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      const result = await api<{ tickets: RepairTicket[] }>(
        "/customer/repairs",
      );
      setTickets(result.tickets);
      setCode("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not link repair.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="customer-repairs">
      <h2>{t("My repairs")}</h2>
      {!customer ? (
        <p>
          {t("Log in to see your repairs and link a shop repair code.")}{" "}
          <Link className="text-link" to="/login?next=/repair">
            {t("Log in")}
          </Link>
        </p>
      ) : (
        <>
          {tickets.map((ticket) => (
            <article className="repair-status-card" key={ticket.id}>
              <strong className="repair-device-name">{ticket.device}</strong>
              <div className="repair-current-status">
                <small>{t("Current status")}</small>
                <strong>{t(ticket.status)}</strong>
              </div>
              <ol>
                {ticket.history.map((event, index) => (
                  <li key={index}>
                    {t(event.status)} ·{" "}
                    {new Date(event.date).toLocaleDateString()}
                  </li>
                ))}
              </ol>
            </article>
          ))}
          <form onSubmit={(event) => void claim(event)}>
            <h3>{t("Link a repair")}</h3>
            <p>
              {t(
                "Enter the phone number and six-digit code given at the shop once.",
              )}
            </p>
            <label>
              {t("Phone")}
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label>
              {t("Six-digit repair code")}
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button className="button dark" disabled={busy}>
              {t(busy ? "Saving…" : "Link repair")}
            </button>
          </form>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {t(error)}
        </p>
      )}
    </section>
  );
}
