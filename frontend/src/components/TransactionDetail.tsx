import { request } from "../api";
import { demoTransactions } from "../data/demo";
import { useLoad } from "../hooks/useLoad";
import { date, label, time, usd } from "../lib";
import type { Session, Transaction } from "../types";
import { Badge, ErrorPanel, Loading, Modal } from "./ui";

export function TransactionDetail({
  session,
  id,
  onClose,
}: {
  session: Session;
  id: number;
  onClose: () => void;
}) {
  const data = useLoad(`detail-${id}`, async () =>
    session.demo
      ? demoTransactions.find((t) => t.id === id)!
      : request<Transaction>(`/transactions/${id}`, session.token),
  );
  return (
    <Modal
      title="Transaction details"
      description="A complete record of this account movement."
      onClose={onClose}
    >
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorPanel message={data.error} retry={data.reload} />
      ) : (
        data.data && (
          <>
            <div className="review-amount">
              <small>{label(data.data.type)}</small>
              <strong>{usd(data.data.amount)}</strong>
              <Badge value={data.data.status} />
            </div>
            <dl className="review-details">
              <div>
                <dt>Reference</dt>
                <dd className="mono">{data.data.reference}</dd>
              </div>
              <div>
                <dt>Date (UTC)</dt>
                <dd>
                  {date(data.data.createdAt)} · {time(data.data.createdAt)}
                </dd>
              </div>
              {data.data.sourceAccountNumber && (
                <div>
                  <dt>From account</dt>
                  <dd className="mono">{data.data.sourceAccountNumber}</dd>
                </div>
              )}
              {data.data.destinationAccountNumber && (
                <div>
                  <dt>To account</dt>
                  <dd className="mono">{data.data.destinationAccountNumber}</dd>
                </div>
              )}
            </dl>
            <button className="button secondary full" onClick={onClose}>
              Close details
            </button>
          </>
        )
      )}
    </Modal>
  );
}
