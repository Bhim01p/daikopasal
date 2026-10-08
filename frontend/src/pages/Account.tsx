import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, LogOut, UserRound, Package } from "lucide-react";
import { useCustomer } from "../context/CustomerContext";
import { api } from "../utils/api";
import type { Customer } from "../types";

function destination(value: string | null) {
  return value &&
    /^\/(checkout|my-orders|account|order\/[a-zA-Z0-9-]+)$/.test(value)
    ? value
    : "/my-orders";
}
export function Login({
  embedded = false,
  onComplete,
}: { embedded?: boolean; onComplete?: () => void } = {}) {
  const formId = useId();
  const {
    customer,
    checking,
    mode,
    error: sessionError,
    refresh,
    setCustomer,
  } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = destination(params.get("next"));
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    expiresAt: number;
    developmentCode?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (customer) {
      setChallenge(null);
      setCode("");
      setError("");
    }
  }, [customer?.id]);
  if (checking)
    return (
      <div className="container empty-state" role="status">
        Checking your login…
      </div>
    );
  if (customer)
    if (embedded) return <Account embedded onComplete={onComplete} />;
    else
      return (
        <Navigate
          replace
          to={
            customer.profileComplete
              ? next
              : `/account?next=${encodeURIComponent(next)}`
          }
        />
      );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!challenge) {
        const result = await api<{
          challengeId: string;
          expiresAt: number;
          developmentCode?: string;
        }>("/customer/auth/start", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        setChallenge(result);
        setCode("");
      } else {
        const result = await api<{ customer: Customer }>(
          "/customer/auth/verify",
          {
            method: "POST",
            body: JSON.stringify({ challengeId: challenge.challengeId, code }),
          },
        );
        setCustomer(result.customer);
        if (embedded) {
          if (result.customer.profileComplete) onComplete?.();
        } else
          navigate(
            result.customer.profileComplete
              ? next
              : `/account?next=${encodeURIComponent(next)}`,
            { replace: true },
          );
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`container account-page ${embedded ? "embedded-account" : ""}`}
    >
      <div className="account-heading">
        <span className="eyebrow">Your shop account</span>
        <h1>Welcome back.</h1>
        <p>Save your details and follow your pickup orders.</p>
      </div>
      <form className="account-form" onSubmit={submit}>
        <UserRound size={32} />
        <h2>{challenge ? "Enter your code" : "Log in with your phone"}</h2>
        {mode === "development" && (
          <p className="account-demo-note">
            Local test mode: no SMS is sent and phone ownership is not verified.
            A test code will appear here.
          </p>
        )}
        {mode === "disabled" && (
          <p className="account-demo-note">
            Phone login is being set up. You can still browse and use guest
            checkout.
          </p>
        )}
        {challenge ? (
          <>
            <p>For {phone}. Your code expires after five minutes.</p>
            {challenge.developmentCode && (
              <p className="account-demo-code">
                Local test code: <strong>{challenge.developmentCode}</strong>
              </p>
            )}
            <label htmlFor={`${formId}-code`}>Verification code</label>
            <input
              id={`${formId}-code`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              required
              autoFocus
            />
          </>
        ) : (
          <>
            <label htmlFor={`${formId}-phone`}>Nepal mobile number</label>
            <input
              id={`${formId}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              maxLength={20}
              required
            />
            <p className="summary-note">
              Use your 10-digit number, with or without +977.
            </p>
          </>
        )}
        {(error || sessionError) && (
          <p className="field-error" role="alert">
            {error || sessionError}
          </p>
        )}
        {sessionError && (
          <button
            type="button"
            className="button white"
            onClick={() => void refresh()}
          >
            Check connection
          </button>
        )}
        <button
          className="button dark full"
          disabled={busy || mode === "disabled"}
        >
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify and log in"
              : mode === "development"
                ? "Get test code"
                : "Send login code"}
          <ArrowRight size={18} />
        </button>
        {challenge && (
          <button
            className="button white full"
            type="button"
            disabled={busy}
            onClick={() => {
              setChallenge(null);
              setCode("");
              setError("");
            }}
          >
            Change number / request new code
          </button>
        )}
        {embedded ? (
          <button type="button" className="text-link" onClick={onComplete}>
            Continue browsing
          </button>
        ) : (
          <Link className="text-link" to="/mobiles">
            Continue browsing
          </Link>
        )}
      </form>
    </div>
  );
}

export default function Account({
  embedded = false,
  onComplete,
}: { embedded?: boolean; onComplete?: () => void } = {}) {
  const formId = useId();
  const {
    customer,
    checking,
    error: sessionError,
    setCustomer,
    logout,
  } = useCustomer();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setName(customer?.name || "");
    setEmail(customer?.email || "");
  }, [customer?.id, customer?.name, customer?.email]);
  if (checking)
    return (
      <div className="container empty-state" role="status">
        Opening your account…
      </div>
    );
  if (!customer)
    return (
      <div className="container standard-page empty-state">
        <UserRound size={38} />
        <h1>Your shop account.</h1>
        <p>Log in to save your details and see your orders.</p>
        {sessionError && <p role="alert">{sessionError}</p>}
        <Link className="button dark" to="/login?next=/account">
          Log in with your phone
        </Link>
      </div>
    );
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ customer: Customer }>("/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      setCustomer(result.customer);
      setNotice("Your details have been saved.");
      if (embedded) onComplete?.();
      else if (params.get("next"))
        navigate(destination(params.get("next")), { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      if (!embedded) navigate("/login", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`container account-page ${embedded ? "embedded-account" : ""}`}
    >
      <div className="account-heading">
        <span className="eyebrow">Your shop account</span>
        <h1>
          {customer.profileComplete
            ? "Your profile."
            : "A few details, just once."}
        </h1>
        <p>We’ll use these details when you place an order.</p>
      </div>
      <div className="account-layout">
        <form className="account-form" onSubmit={save}>
          <h2>Customer details</h2>
          <label>Login number</label>
          <p className="account-phone">{customer.phone}</p>
          <p className="summary-note">
            To use another number, sign out and log in with that number.
          </p>
          <label htmlFor={`${formId}-name`}>Full name</label>
          <input
            id={`${formId}-name`}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
          <label htmlFor={`${formId}-email`}>Email address</label>
          <input
            id={`${formId}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
          />
          <p className="summary-note">
            Use the inbox where you want to receive order and pickup updates.
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
          <button className="button dark full" disabled={busy}>
            {busy
              ? "Saving…"
              : !customer.profileComplete || (!embedded && params.get("next"))
                ? "Save and continue"
                : "Save details"}
            <ArrowRight size={18} />
          </button>
        </form>
        <aside className="account-form account-actions">
          <Package size={32} />
          <h2>Follow your orders</h2>
          <p>
            See orders placed while signed in, with their current pickup status.
          </p>
          <Link className="button white full" to="/my-orders">
            My orders
            <ArrowRight size={18} />
          </Link>
          <button
            className="button white full"
            disabled={busy}
            onClick={() => void signOut()}
          >
            <LogOut size={18} />
            Log out
          </button>
        </aside>
      </div>
    </div>
  );
}
