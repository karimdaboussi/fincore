import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { onSessionExpired } from "./api";
import { Workspace } from "./components/Workspace";
import AuthScreen from "./pages/AuthScreen";
import type { Notify, Session } from "./types";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const notify: Notify = (message, error = false) =>
    setToast({ message, error });
  useEffect(() => {
    return onSessionExpired(() => {
      setSession(null);
      setMessage("Your session has expired. Please sign in again.");
    });
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setSession(null);
        setMessage("Your session has expired. Please sign in again.");
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return (
    <>
      {session ? (
        <Workspace
          key={`${session.customer.id}-${session.demo}-${session.customer.role}`}
          session={session}
          notify={notify}
          onLogout={() => {
            setSession(null);
            setMessage("");
          }}
        />
      ) : (
        <AuthScreen
          message={message}
          onLogin={(value) => {
            setSession(value);
            setMessage("");
          }}
        />
      )}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className={`toast ${toast.error ? "toast-error" : ""}`}>
            <CheckCircle size={21} />
            <span>{toast.message}</span>
            <button
              className="icon-button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
