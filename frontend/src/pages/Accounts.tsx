import { Bank, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { request } from "../api";
import { ConfirmAction } from "../components/ConfirmAction";
import { Badge, Empty, ErrorPanel, Loading, Pager } from "../components/ui";
import { demoAccounts, demoPage } from "../data/demo";
import { useLoad } from "../hooks/useLoad";
import { label, normalizePage, usd } from "../lib";
import type { Account, Notify, Page, Session } from "../types";

export function Accounts({
  session,
  revision,
  onChange,
  onDeposit,
  notify,
}: {
  session: Session;
  revision: number;
  onChange: () => void;
  onDeposit: (a: Account) => void;
  notify: Notify;
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<{
    account: Account;
    type: "freeze" | "unfreeze" | "close";
  } | null>(null);
  const data = useLoad(`accounts-${page}-${revision}`, async () =>
    session.demo
      ? demoPage(demoAccounts, page)
      : normalizePage(
          await request<Page<Account>>(
            `/admin/accounts?page=${page}&size=20`,
            session.token,
          ),
        ),
  );
  const rows = (data.data?.content || []).filter((a) =>
    a.accountNumber.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>Account directory</h2>
            <p>Select an account to add funds or manage access.</p>
          </div>
          <span className="subtle-tag">
            {data.data?.page.totalElements ?? "?"} ACCOUNTS
          </span>
        </div>
        <div className="directory-toolbar">
          <label className="search-field">
            <MagnifyingGlass size={18} />
            <input
              aria-label="Search accounts on this page"
              placeholder="Search this page by account number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">USD accounts</span>
        </div>
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorPanel message={data.error} retry={data.reload} />
        ) : (
          <>
            {rows.length ? (
              <div className="table-scroll">
                <table className="accounts-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Status</th>
                      <th className="align-right">Balance</th>
                      <th className="align-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="customer-name">
                            <span className="tx-icon neutral">
                              <Bank size={20} />
                            </span>
                            <span>
                              <b className="mono">{a.accountNumber}</b>
                              <small>Account #{a.id} · USD</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <Badge value={a.status} />
                        </td>
                        <td className="align-right amount-cell">
                          {usd(a.balance)}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="button compact primary"
                              disabled={a.status === "CLOSED"}
                              onClick={() => onDeposit(a)}
                            >
                              <Plus size={15} />
                              Deposit
                            </button>
                            {a.status !== "CLOSED" && (
                              <>
                                <button
                                  className="button compact secondary"
                                  onClick={() =>
                                    setAction({
                                      account: a,
                                      type:
                                        a.status === "FROZEN"
                                          ? "unfreeze"
                                          : "freeze",
                                    })
                                  }
                                >
                                  {a.status === "FROZEN"
                                    ? "Unfreeze"
                                    : "Freeze"}
                                </button>
                                <button
                                  className="icon-button"
                                  title={
                                    a.balance !== 0
                                      ? "A zero balance is required to close an account"
                                      : "Close account"
                                  }
                                  aria-label={`Close account ${a.accountNumber}`}
                                  disabled={a.balance !== 0}
                                  onClick={() =>
                                    setAction({ account: a, type: "close" })
                                  }
                                >
                                  <X size={17} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No accounts found"
                description={
                  search
                    ? "Try a different account number or clear the search."
                    : "Accounts will appear when customers register."
                }
              />
            )}
            <Pager
              page={page}
              totalPages={data.data?.page.totalPages || 0}
              total={data.data?.page.totalElements || 0}
              onChange={(n) => {
                setPage(n);
                setSearch("");
              }}
            />
          </>
        )}
      </section>
      {action && (
        <ConfirmAction
          title={`${label(action.type)} account?`}
          description={action.account.accountNumber}
          detail={
            action.type === "close"
              ? "Closing an account is permanent. It must have a zero balance and cannot be reopened."
              : action.type === "freeze"
                ? "This account will no longer be able to send or receive transfers, or make withdrawals. Administrator deposits remain available."
                : "This account will be active again. The customer’s approval status still applies."
          }
          button={`${label(action.type)} account`}
          danger={action.type === "close"}
          session={session}
          onClose={() => setAction(null)}
          onConfirm={async () => {
            await request(
              `/admin/accounts/${action.account.id}/${action.type}`,
              session.token,
              { method: "PATCH" },
            );
            notify(
              `Account ${action.type === "close" ? "closed" : action.type === "freeze" ? "frozen" : "unfrozen"} successfully.`,
            );
            onChange();
          }}
        />
      )}
    </>
  );
}
