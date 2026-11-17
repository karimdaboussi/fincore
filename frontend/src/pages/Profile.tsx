import { Check, LockKey } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { request } from "../api";
import { Badge, Field, Spinner } from "../components/ui";
import { date, initials, label } from "../lib";
import type { Customer, Notify, Session } from "../types";

export function Profile({
  session,
  customer,
  onChange,
  notify,
}: {
  session: Session;
  customer: Customer;
  onChange: () => void;
  notify: Notify;
}) {
  const [name, setName] = useState(customer.fullName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setName(customer.fullName), [customer.fullName]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (session.demo) return;
    setBusy(true);
    setError("");
    try {
      await request("/customers/me", session.token, {
        method: "PATCH",
        body: { fullName: name.trim() },
      });
      notify("Your profile has been updated.");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-layout">
      <section className="panel profile-panel">
        <div className="section-title">
          <div>
            <h2>Personal details</h2>
            <p>Keep your account information up to date.</p>
          </div>
          <span className="avatar profile-avatar">
            {initials(customer.fullName)}
          </span>
        </div>
        <form className="profile-form" onSubmit={submit}>
          <Field label="Full name">
            <input
              name="fullName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              disabled={busy}
            />
          </Field>
          <Field
            label="Email address"
            hint="Your email is used to sign in and cannot be changed here."
          >
            <input type="email" value={customer.email} readOnly />
          </Field>
          <div className="profile-meta">
            <div>
              <span>Account role</span>
              <b>{label(customer.role)}</b>
            </div>
            <div>
              <span>Application status</span>
              <Badge value={customer.status} />
            </div>
            <div>
              <span>Member since</span>
              <b>{date(customer.createdAt)}</b>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {session.demo && (
            <div className="notice">
              Profile changes are disabled in the demo.
            </div>
          )}
          <button
            className="button primary"
            disabled={
              busy ||
              session.demo ||
              !name.trim() ||
              name.trim() === customer.fullName
            }
          >
            {busy ? <Spinner /> : <Check size={18} />}Save changes
          </button>
        </form>
      </section>
      <section className="panel note-card security-card">
        <LockKey size={29} />
        <h3>Your account, protected.</h3>
        <p>
          Your banking session expires automatically after one hour. Sign out
          when you’re finished, especially on shared devices.
        </p>
        <p>Never share your password or authorization token.</p>
      </section>
    </div>
  );
}
