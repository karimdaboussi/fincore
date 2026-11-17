import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  CheckCircle,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { ApiError, request } from "../api";
import { cents, RequestIdentity, usd, validateAmount } from "../lib";
import type { Account, Session, Transaction } from "../types";
import { Field, Modal, Spinner } from "./ui";
export type MoneyKind = "transfer" | "withdraw" | "deposit";
export default function MoneyDialog({
  kind,
  session,
  account,
  onClose,
  onComplete,
}: {
  kind: MoneyKind;
  session: Session;
  account: Account | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);
  const identity = useRef(new RequestIdentity());
  const title =
    kind === "transfer"
      ? "Send money"
      : kind === "deposit"
        ? "Add funds"
        : "Withdraw money";
  const Icon =
    kind === "transfer"
      ? ArrowsLeftRight
      : kind === "deposit"
        ? Plus
        : ArrowUpRight;
  function review(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      validateAmount(
        amount,
        kind === "deposit"
          ? 1000000n
          : kind === "transfer"
            ? 500000n
            : undefined,
      );
      if (
        kind !== "deposit" &&
        account &&
        cents(amount) > BigInt(Math.round(account.balance * 100))
      )
        throw new Error("This amount is above your available balance.");
      if (kind === "transfer" && !destination.trim())
        throw new Error("Enter the recipient's full account number.");
      if (destination.trim() === account?.accountNumber)
        throw new Error("Choose a different account to send money to.");
      setStep("review");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function confirm() {
    if (session.demo) return;
    setBusy(true);
    setError("");
    const body =
      kind === "transfer"
        ? { destinationAccountNumber: destination.trim(), amount }
        : { amount };
    const path =
      kind === "deposit"
        ? `/admin/accounts/${account!.id}/deposit`
        : `/transactions/${kind}`;
    const key = identity.current.for({ path, body });
    try {
      const tx = await request<Transaction>(path, session.token, {
        method: "POST",
        body,
        key,
      });
      setResult(tx);
      setUncertain(false);
      setStep("done");
      onComplete();
    } catch (e) {
      setError((e as Error).message);
      setUncertain(e instanceof ApiError && e.uncertain);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={step === "done" ? "All taken care of." : title}
      description={
        step === "done"
          ? "Your transaction has been completed."
          : step === "review"
            ? "Take a moment to check the details."
            : "A few details, then you’re on your way."
      }
      onClose={onClose}
      busy={busy || uncertain}
    >
      {step === "done" && result ? (
        <div className="transaction-success">
          <span>
            <CheckCircle size={48} weight="fill" />
          </span>
          <h3>{usd(result.amount)}</h3>
          <p>
            {kind === "transfer"
              ? "Sent successfully"
              : kind === "deposit"
                ? "Added to the account"
                : "Withdrawal completed"}
          </p>
          <dl className="review-details">
            <div>
              <dt>Reference</dt>
              <dd className="mono small">{result.reference}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>Completed</dd>
            </div>
          </dl>
          <button className="button primary full" onClick={onClose}>
            Done
            <CheckCircle size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="money-account">
            <span className="mini-icon">
              <Icon size={22} />
            </span>
            <div>
              <b>
                {kind === "deposit"
                  ? "Destination account"
                  : "Your USD account"}
              </b>
              <span className="mono">{account?.accountNumber || "\u2014"}</span>
            </div>
            <span>{account ? usd(account.balance) : "\u2014"}</span>
          </div>
          {session.demo && (
            <div className="notice">
              You’re exploring a read-only demo. Sign in to make a transaction.
            </div>
          )}
          {step === "form" ? (
            <form onSubmit={review}>
              {kind === "transfer" && (
                <Field label="Recipient account number">
                  <input
                    autoFocus
                    name="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter the full ACC account number"
                    required
                    maxLength={255}
                  />
                </Field>
              )}
              <Field
                label="Amount in USD"
                hint={
                  kind === "transfer"
                    ? "Up to $5,000 in total outgoing transfers per UTC day."
                    : kind === "deposit"
                      ? "Maximum $10,000 per deposit."
                      : "The amount will be deducted from your available balance."
                }
              >
                <span className="amount-input">
                  <span>$</span>
                  <input
                    autoFocus={kind !== "transfer"}
                    inputMode="decimal"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <span>USD</span>
                </span>
              </Field>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button primary full" type="submit">
                Review{" "}
                {kind === "deposit"
                  ? "deposit"
                  : kind === "withdraw"
                    ? "withdrawal"
                    : "transfer"}
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <>
              <div className="review-amount">
                <small>
                  YOU ARE{" "}
                  {kind === "transfer"
                    ? "SENDING"
                    : kind === "deposit"
                      ? "ADDING"
                      : "WITHDRAWING"}
                </small>
                <strong>{usd(amount)}</strong>
                <span>US dollars</span>
              </div>
              <dl className="review-details">
                {kind === "transfer" && (
                  <div>
                    <dt>To account</dt>
                    <dd className="mono">{destination}</dd>
                  </div>
                )}
                <div>
                  <dt>Currency</dt>
                  <dd>USD</dd>
                </div>
                <div>
                  <dt>Processing</dt>
                  <dd>Immediately on confirmation</dd>
                </div>
              </dl>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  disabled={busy || uncertain}
                  onClick={() => {
                    setStep("form");
                    setError("");
                  }}
                >
                  <ArrowLeft size={17} />
                  Edit
                </button>
                <button
                  className="button primary"
                  disabled={busy || session.demo}
                  onClick={confirm}
                >
                  {busy ? (
                    <Spinner />
                  ) : uncertain ? (
                    "Retry same request"
                  ) : (
                    `Confirm ${kind === "withdraw" ? "withdrawal" : kind}`
                  )}
                  {!busy && <ArrowRight size={18} />}
                </button>
              </div>
            </>
          )}
          <p className="security-note">
            <ShieldCheck size={15} />
            Every transaction is recorded in your activity.
          </p>
        </>
      )}
    </Modal>
  );
}
