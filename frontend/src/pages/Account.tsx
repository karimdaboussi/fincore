import {
  ArrowsLeftRight,
  ArrowUpRight,
  Bank,
  Copy,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { MoneyKind } from "../components/MoneyDialog";
import { Badge } from "../components/ui";
import { usd } from "../lib";
import type { Account, Notify } from "../types";

export function AccountScreen({
  account,
  notify,
  active,
  onMoney,
}: {
  account: Account;
  notify: Notify;
  active: boolean;
  onMoney: (k: MoneyKind) => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      notify("Account number copied.");
    } catch {
      notify(
        "Copy is unavailable. Select and copy the account number below.",
        true,
      );
    }
  }
  return (
    <div className="account-layout">
      <section className="panel account-details">
        <div className="section-title">
          <div>
            <h2>Everyday USD account</h2>
            <p>The details you need to receive a transfer.</p>
          </div>
          <Badge value={account.status} />
        </div>
        <div className="account-hero">
          <span className="mini-icon">
            <Bank size={28} />
          </span>
          <span>AVAILABLE BALANCE</span>
          <strong>{usd(account.balance)}</strong>
          <small>US dollars · USD</small>
        </div>
        <dl className="account-fields">
          <div>
            <dt>Account number</dt>
            <dd>
              <span className="mono">{account.accountNumber}</span>
              <button
                className="icon-button"
                aria-label="Copy account number"
                onClick={copy}
              >
                <Copy size={18} />
              </button>
            </dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>USD ? US dollar</dd>
          </div>
          <div>
            <dt>Account status</dt>
            <dd>
              <Badge value={account.status} />
            </dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>Personal</dd>
          </div>
        </dl>
        <div className="account-buttons">
          <button
            className="button primary"
            disabled={!active}
            onClick={() => onMoney("transfer")}
          >
            <ArrowsLeftRight size={18} />
            Send money
          </button>
          <button
            className="button secondary"
            disabled={!active}
            onClick={() => onMoney("withdraw")}
          >
            <ArrowUpRight size={18} />
            Withdraw
          </button>
        </div>
      </section>
      <aside className="account-notes">
        <section className="panel note-card">
          <ShieldCheck size={29} />
          <h3>Made for everyday clarity.</h3>
          <p>
            Share your account number to receive a transfer from another
            approved FinCore account.
          </p>
          <div className="note-divider" />
          <h4>Good to know</h4>
          <p>
            Outgoing transfers have a $5,000 daily limit, resetting at midnight
            UTC.
          </p>
          <p>
            Deposits are added by an administrator. Closed accounts cannot
            receive funds.
          </p>
        </section>
      </aside>
    </div>
  );
}
