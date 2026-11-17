import { Check } from "@phosphor-icons/react";
import { useState } from "react";
import type { Session } from "../types";
import { Modal, Spinner } from "./ui";

export function ConfirmAction({
  title,
  description,
  detail,
  button,
  danger,
  session,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  detail: string;
  button: string;
  danger: boolean;
  session: Session;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (session.demo) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      busy={busy}
    >
      <p className="confirmation-copy">{detail}</p>
      {session.demo && (
        <div className="notice">
          Changes are disabled in this read-only demo. Sign in to manage real
          accounts.
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className={`button ${danger ? "danger" : "primary"}`}
          disabled={busy || session.demo}
          onClick={confirm}
        >
          {busy ? <Spinner /> : <Check size={17} />} {button}
        </button>
      </div>
    </Modal>
  );
}
