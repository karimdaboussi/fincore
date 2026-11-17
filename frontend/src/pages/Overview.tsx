import {
  ArrowDownLeft,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  Bank,
  Clock,
  CreditCard,
  Eye,
  EyeSlash,
  LockKey,
  ShieldCheck,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { MoneyKind } from "../components/MoneyDialog";
import { TransactionTable } from "../components/TransactionTable";
import { Badge } from "../components/ui";
import { incoming, usd } from "../lib";
import type { Account, Stats, Transaction, View } from "../types";

export function Overview({
  admin,
  account,
  stats,
  transactions,
  active,
  onMoney,
  navigate,
  onDetail,
}: {
  admin: boolean;
  account: Account | null;
  stats: Stats | null;
  transactions: Transaction[];
  active: boolean;
  onMoney: (k: MoneyKind) => void;
  navigate: (v: View) => void;
  onDetail: (id: number) => void;
}) {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const incomingTotal = transactions
    .filter((t) => incoming(t, account))
    .reduce((s, t) => s + t.amount, 0);
  const outgoingTotal = transactions
    .filter((t) => (admin ? t.type === "WITHDRAWAL" : !incoming(t, account)))
    .reduce((s, t) => s + t.amount, 0);
  return (
    <>
      <div className="overview-grid">
        <section className="balance-card">
          <div className="balance-card-heading">
            <span>
              <span className="balance-icon">
                <Wallet size={20} />
              </span>
              {admin ? "Funds across accounts" : "Available balance"}
              <button
                className="balance-privacy"
                aria-label={
                  balanceVisible
                    ? "Hide available balance"
                    : "Show available balance"
                }
                aria-pressed={!balanceVisible}
                onClick={() => setBalanceVisible((v) => !v)}
              >
                {balanceVisible ? <Eye size={16} /> : <EyeSlash size={16} />}
              </button>
            </span>
            {account ? (
              <Badge value={account.status} />
            ) : (
              <span className="balance-usd">USD</span>
            )}
          </div>
          <div className="balance-number">
            <strong className={balanceVisible ? "" : "balance-hidden"}>
              {balanceVisible
                ? usd(
                    admin ? stats?.totalBalanceUSD || 0 : account?.balance || 0,
                  )
                : "Hidden"}
            </strong>
            <span>USD</span>
          </div>
          <p>
            {admin
              ? "Total funds held across the system"
              : "Ready for whatever comes next."}
          </p>
          <div className="balance-divider" />
          <div className="balance-card-bottom">
            <div>
              <small>{admin ? "WORKSPACE" : "EVERYDAY ACCOUNT"}</small>
              <span className="mono">
                {admin
                  ? "FinCore administration"
                  : `•••• ${account?.accountNumber.slice(-8) || ""}`}
              </span>
            </div>
            <ShieldCheck size={31} />
          </div>
          <div className="balance-decoration" aria-hidden="true" />
        </section>
        <section className="panel quick-actions">
          <div className="section-title">
            <h2>{admin ? "Workspace at a glance" : "Make your next move"}</h2>
            <span className="muted">
              {admin ? "System totals" : "QUICK ACTIONS"}
            </span>
          </div>
          {admin ? (
            <div className="admin-mini-stats">
              <div>
                <span>Customers</span>
                <strong>{stats?.customers || 0}</strong>
              </div>
              <div>
                <span>Accounts</span>
                <strong>{stats?.accounts || 0}</strong>
              </div>
              <div>
                <span>Transactions</span>
                <strong>{stats?.transactions || 0}</strong>
              </div>
            </div>
          ) : (
            <div className="action-tiles">
              <button disabled={!active} onClick={() => onMoney("transfer")}>
                <span>
                  <ArrowsLeftRight size={23} />
                </span>
                <b>Send money</b>
                <small>Make a transfer</small>
              </button>
              <button disabled={!active} onClick={() => onMoney("withdraw")}>
                <span>
                  <ArrowUpRight size={23} />
                </span>
                <b>Withdraw</b>
                <small>Access your funds</small>
              </button>
              <button onClick={() => navigate("account")}>
                <span>
                  <CreditCard size={23} />
                </span>
                <b>Account details</b>
                <small>The essentials</small>
              </button>
            </div>
          )}
          <div className="quick-action-note">
            <ShieldCheck size={17} />
            <span>
              {admin
                ? "All administrative actions require your authorization."
                : active
                  ? "Your account is active and ready to use."
                  : "Financial actions require an approved, active account."}
            </span>
            {admin && (
              <button
                className="text-button"
                onClick={() => navigate("accounts")}
              >
                Manage
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>
        <section className="panel account-overview">
          <div className="section-title">
            <div>
              <h2>{admin ? "Operations desk" : "Account overview"}</h2>
              <p>
                {admin
                  ? "Your next administrative action."
                  : "One account. Everything in view."}
              </p>
            </div>
            <Bank size={20} />
          </div>
          {admin ? (
            <div className="account-summary-list">
              <button
                className="account-summary-row"
                onClick={() => navigate("customers")}
              >
                <span className="summary-symbol">
                  <Users size={21} />
                </span>
                <span>
                  <b>Customer applications</b>
                  <small>Approve or reject pending requests</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <button
                className="account-summary-row"
                onClick={() => navigate("accounts")}
              >
                <span className="summary-symbol">
                  <Bank size={21} />
                </span>
                <span>
                  <b>Account management</b>
                  <small>Deposit, freeze, or unfreeze</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <button
                className="account-summary-row"
                onClick={() => navigate("activity")}
              >
                <span className="summary-symbol">
                  <ArrowsLeftRight size={21} />
                </span>
                <span>
                  <b>Transaction review</b>
                  <small>Browse records across the system</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            </div>
          ) : (
            <div className="account-summary-list">
              <button
                className="account-summary-row"
                onClick={() => navigate("account")}
              >
                <span className="summary-symbol">
                  <Wallet size={21} />
                </span>
                <span>
                  <b>Personal USD account</b>
                  <small className="mono">
                    {account?.accountNumber
                      ? `Ending ${account.accountNumber.slice(-8)}`
                      : "Account details"}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <div className="account-summary-row">
                <span className="summary-symbol">
                  <ShieldCheck size={21} />
                </span>
                <span>
                  <b>Account status</b>
                  <small>
                    {active
                      ? "Ready for everyday banking"
                      : "View your account for details"}
                  </small>
                </span>
                {account && <Badge value={account.status} />}
              </div>
              <div className="account-summary-row">
                <span className="summary-symbol">
                  <Clock size={21} />
                </span>
                <span>
                  <b>Daily transfer limit</b>
                  <small>Outgoing transfers reset at 00:00 UTC</small>
                </span>
                <strong>$5,000</strong>
              </div>
            </div>
          )}
          <div className="account-summary-footer">
            <LockKey size={15} />
            <span>
              {admin
                ? "Restricted to administrator access"
                : "Deposits are added by an administrator"}
            </span>
          </div>
        </section>
      </div>
      <div className="insights-grid">
        <section className="panel chart-panel">
          <div className="section-title">
            <div>
              <h2>Money in motion</h2>
              <p>Your recent activity, in perspective.</p>
            </div>
            <span className="subtle-tag">LAST 7 DAYS</span>
          </div>
          <ActivityChart transactions={transactions} account={account} />
          <div className="chart-legend">
            <span>
              <i />
              Money in
            </span>
            <span>
              <i />
              Money out
            </span>
            <small>
              Based on the latest {transactions.length} transactions
            </small>
          </div>
        </section>
        <section className="panel flow-panel">
          <div className="section-title">
            <h2>Recent cash flow</h2>
            <ArrowUpRight size={19} />
          </div>
          <div className="flow-row">
            <span className="tx-icon positive">
              <ArrowDownLeft size={21} />
            </span>
            <div>
              <span>Money in</span>
              <strong>{usd(incomingTotal)}</strong>
            </div>
          </div>
          <div className="flow-row">
            <span className="tx-icon neutral">
              <ArrowUpRight size={21} />
            </span>
            <div>
              <span>Money out</span>
              <strong>{usd(outgoingTotal)}</strong>
            </div>
          </div>
          <div className="flow-footer">
            <span>Recent net movement</span>
            <b className={incomingTotal - outgoingTotal >= 0 ? "teal" : ""}>
              {incomingTotal - outgoingTotal >= 0 ? "+" : "\u2212"}
              {usd(Math.abs(incomingTotal - outgoingTotal))}
            </b>
          </div>
          <small className="flow-caption">
            Totals reflect the latest {transactions.length} transactions.
          </small>
        </section>
      </div>
      <section className="panel transactions-panel">
        <div className="section-title">
          <div>
            <h2>Recent transactions</h2>
            <p>A closer look at your latest activity.</p>
          </div>
          <button className="text-button" onClick={() => navigate("activity")}>
            View all activity
            <ArrowRight size={17} />
          </button>
        </div>
        <TransactionTable
          transactions={transactions.slice(0, 5)}
          account={account}
          onDetail={onDetail}
        />
      </section>
    </>
  );
}

function ActivityChart({
  transactions,
  account,
}: {
  transactions: Transaction[];
  account: Account | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 6 + i);
    return {
      key: d.toISOString().slice(0, 10),
      name: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(d),
      in: 0,
      out: 0,
    };
  });
  for (const t of transactions) {
    if (!account && t.type === "TRANSFER") continue;
    const day = days.find((d) => d.key === t.createdAt.slice(0, 10));
    if (day) day[incoming(t, account) ? "in" : "out"] += t.amount;
  }
  const max = Math.max(1, ...days.flatMap((d) => [d.in, d.out]));
  const ceiling =
    Math.ceil(max / (max > 1000 ? 1000 : max > 100 ? 100 : 10)) *
    (max > 1000 ? 1000 : max > 100 ? 100 : 10);
  return (
    <div
      className="activity-chart"
      role="img"
      aria-label="Money received and sent over the past seven days"
    >
      <div className="chart-axis">
        {[1, 0.5, 0].map((n) => (
          <span key={n}>
            {ceiling * n >= 1000
              ? `${(ceiling * n) / 1000}k`
              : Math.round(ceiling * n)}
          </span>
        ))}
      </div>
      <div className="chart-plot">
        <div className="chart-grid-lines">
          <i />
          <i />
          <i />
        </div>
        {days.map((day) => (
          <div className="chart-day" key={day.key}>
            <div
              className="chart-bars"
              title={`${day.name}: ${usd(day.in)} in, ${usd(day.out)} out`}
            >
              <span
                style={{
                  height: `${(day.in / ceiling) * 100}%`,
                  minHeight: day.in ? 4 : 0,
                }}
              />
              <span
                style={{
                  height: `${(day.out / ceiling) * 100}%`,
                  minHeight: day.out ? 4 : 0,
                }}
              />
            </div>
            <span>{day.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
