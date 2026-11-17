import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { request } from "../api";
import { Brand, Field, Spinner } from "../components/ui";
import { demoSession } from "../data/demo";
import type { Customer, Login, Session } from "../types";
export default function AuthScreen({
  onLogin,
  message,
}: {
  onLogin: (session: Session) => void;
  message: string;
}) {
  const [register, setRegister] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminDemo, setAdminDemo] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    setError("");
    setSuccess("");
    if (new TextEncoder().encode(password).length > 72) {
      setError("Your password must be at most 72 UTF-8 bytes.");
      return;
    }
    setBusy(true);
    try {
      if (register) {
        await request<Customer>("/auth/register", undefined, {
          method: "POST",
          body: {
            fullName: String(data.get("fullName")).trim(),
            email,
            password,
          },
        });
        setRegister(false);
        setSuccess(
          "Your application has been submitted. Sign in to follow your approval status.",
        );
      } else {
        const result = await request<Login>("/auth/login", undefined, {
          method: "POST",
          body: { email, password },
        });
        onLogin({
          token: result.accessToken,
          customer: result.customer,
          expiresAt: Date.now() + result.expiresIn * 1000,
          demo: false,
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand light />
        <div className="auth-story-copy">
          <span className="eyebrow light">DIGITAL BANKING, WITH FINCORE</span>
          <h1>
            Every detail.
            <br />
            Every transfer.
            <br />
            <span>In your control.</span>
          </h1>
          <p>
            One place for your everyday banking.
            <br />
            Clear balances. Simple transfers. Full visibility.
          </p>
        </div>
        <div className="auth-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-account">
            <span>FinCore USD account</span>
            <ShieldCheck size={22} />
            <strong>In your control.</strong>
            <div className="art-dots">
              <i />
              <i />
              <i />
              <i />
              <small>USD ACCOUNT</small>
            </div>
            <div className="art-account-bottom">
              <span>MADE FOR EVERY DAY</span>
              <div className="brand-mark">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="art-receipt">
            <span className="tx-icon positive">
              <ArrowDownLeft size={20} />
            </span>
            <div>
              <b>Funds received</b>
              <small>Right where they belong.</small>
            </div>
            <CheckCircle size={21} weight="fill" />
          </div>
        </div>
        <div className="auth-story-footer">
          <span>Thoughtfully simple. Always clear.</span>
          <span>FinCore / 01</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-top">
          <span>Your banking. Your perspective.</span>
          <span>
            <LockKey size={15} /> Secure sign in
          </span>
        </div>
        <main className="auth-form-wrap">
          <span className="eyebrow">YOUR FINCORE ACCOUNT</span>
          <h2>{register ? "A fresh start." : "Welcome back."}</h2>
          <p className="auth-subtitle">
            {register
              ? "Apply for an account. Make room for what’s next."
              : "Sign in to see the bigger picture."}
          </p>
          <div className="auth-tabs" aria-label="Account access">
            <button
              type="button"
              className={!register ? "selected" : ""}
              disabled={busy}
              onClick={() => {
                setRegister(false);
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={register ? "selected" : ""}
              disabled={busy}
              onClick={() => {
                setRegister(true);
                setError("");
              }}
            >
              Create account
            </button>
          </div>
          {(message || success) && (
            <div className="notice" role="status">
              {success || message}
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <Field label="Full name">
                <input
                  name="fullName"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Your full name"
                  disabled={busy}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="you@example.com"
                disabled={busy}
              />
            </Field>
            <Field
              label="Password"
              hint={
                register
                  ? "At least 12 characters; at most 72 UTF-8 bytes."
                  : undefined
              }
            >
              <span className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                  minLength={register ? 12 : 1}
                  maxLength={72}
                  placeholder={
                    register
                      ? "Create a strong password"
                      : "Enter your password"
                  }
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeSlash size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary auth-submit" disabled={busy}>
              {busy ? (
                <Spinner />
              ) : register ? (
                "Create your account"
              ) : (
                "Sign in to FinCore"
              )}
              {!busy && <ArrowRight size={19} />}
            </button>
          </form>
          <div className="auth-divider">
            <span>TAKE A LOOK AROUND</span>
          </div>
          <div className="demo-role">
            <button
              className={!adminDemo ? "selected" : ""}
              onClick={() => setAdminDemo(false)}
            >
              Personal banking
            </button>
            <button
              className={adminDemo ? "selected" : ""}
              onClick={() => setAdminDemo(true)}
            >
              Administration
            </button>
          </div>
          <button
            className="button secondary demo-button"
            onClick={() => onLogin(demoSession(adminDemo))}
          >
            Explore the demo
            <ArrowUpRight size={18} />
          </button>
          <p className="demo-caption">
            A read-only preview with sample data. No account needed.
          </p>
        </main>
        <footer className="auth-footer">
          <span>&copy; {new Date().getFullYear()} FinCore</span>
          <span>Educational banking simulation</span>
        </footer>
      </section>
    </div>
  );
}
