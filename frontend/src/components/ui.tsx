import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  CircleNotch,
  Receipt,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { label } from "../lib";
export function Brand({
  light = false,
  onHome,
}: {
  light?: boolean;
  onHome?: () => void;
}) {
  return (
    <a
      className={`brand ${light ? "brand-light" : ""}`}
      href="#"
      onClick={
        onHome
          ? (e) => {
              e.preventDefault();
              onHome();
            }
          : undefined
      }
      aria-label="FinCore home"
    >
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      FinCore<span className="brand-dot">.</span>
    </a>
  );
}
export function Spinner() {
  return <CircleNotch className="spinner" size={18} aria-hidden="true" />;
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase()}`}>
      <span />
      {label(value)}
    </span>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close
              className="icon-button"
              disabled={busy}
              aria-label="Close dialog"
            >
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = "Nothing here just yet",
  description = "Your activity will appear here once you make your first transaction.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Receipt size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="error-panel" role="alert">
      <WarningCircle size={25} />
      <div>
        <h3>We couldn’t load this view</h3>
        <p>{message}</p>
      </div>
      <button className="button secondary" onClick={retry}>
        <ArrowClockwise size={17} />
        Try again
      </button>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <Spinner />
      <span>Getting everything ready...</span>
    </div>
  );
}
export function Pager({
  page,
  totalPages,
  total,
  size = 20,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  size?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        {total
          ? `${page * size + 1} - ${Math.min((page + 1) * size, total)} of ${total}`
          : "0 results"}
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          <CaretLeft size={17} />
        </button>
        <span>
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={page + 1 >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <CaretRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Field({
  label: text,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{text}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
