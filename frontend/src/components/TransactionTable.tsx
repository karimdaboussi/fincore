import { ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react";
import { date, incoming, time, usd } from "../lib";
import type { Account, Transaction } from "../types";
import { Badge, Empty } from "./ui";

export function TransactionTable({
  transactions,
  account,
  onDetail,
}: {
  transactions: Transaction[];
  account: Account | null;
  onDetail: (id: number) => void;
}) {
  if (!transactions.length) return <Empty />;
  return (
    <div className="table-scroll">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>
              Date <small>UTC</small>
            </th>
            <th>Status</th>
            <th className="align-right">Amount</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const received = incoming(t, account);
            return (
              <tr key={t.id}>
                <td>
                  <button
                    className="transaction-name"
                    onClick={() => onDetail(t.id)}
                  >
                    <span
                      className={`tx-icon ${received ? "positive" : "neutral"}`}
                    >
                      {received ? (
                        <ArrowDownLeft size={20} />
                      ) : (
                        <ArrowUpRight size={20} />
                      )}
                    </span>
                    <span>
                      <b>
                        {t.type === "DEPOSIT"
                          ? "Account deposit"
                          : t.type === "WITHDRAWAL"
                            ? "Cash withdrawal"
                            : !account
                              ? "Account transfer"
                              : received
                                ? "Transfer received"
                                : "Transfer sent"}
                      </b>
                      <small className="mono">
                        {t.reference.slice(0, 18)}...
                      </small>
                      <small className="mobile-transaction-date">
                        {date(t.createdAt)}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="table-date">{date(t.createdAt)}</span>
                  <small className="table-time">{time(t.createdAt)}</small>
                </td>
                <td>
                  <Badge value={t.status} />
                </td>
                <td
                  className={`align-right amount-cell ${received ? "teal" : ""}`}
                >
                  {account ? (received ? "+" : "\u2212") : ""}
                  {usd(t.amount)}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`View transaction ${t.reference}`}
                    onClick={() => onDetail(t.id)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
