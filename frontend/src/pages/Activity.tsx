import { DownloadSimple } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { request } from "../api";
import { TransactionTable } from "../components/TransactionTable";
import { ErrorPanel, Field, Loading, Pager } from "../components/ui";
import { demoPage, filterDemo } from "../data/demo";
import { useLoad } from "../hooks/useLoad";
import { csv, normalizePage, query } from "../lib";
import type {
  Account,
  Filters,
  Notify,
  Page,
  Session,
  Transaction,
} from "../types";

export function Activity({
  session,
  account,
  revision,
  onDetail,
  notify,
}: {
  session: Session;
  account: Account | null;
  revision: number;
  onDetail: (n: number) => void;
  notify: Notify;
}) {
  const [filters, setFilters] = useState<Filters>({
    type: "",
    from: "",
    to: "",
  });
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const data = useLoad(
    `activity-${session.customer.id}-${JSON.stringify(filters)}-${page}-${revision}`,
    async () =>
      session.demo
        ? demoPage(filterDemo(filters), page)
        : normalizePage(
            await request<Page<Transaction>>(
              `${session.customer.role === "ADMIN" ? "/admin/transactions" : "/transactions/me"}${query(filters, page)}`,
              session.token,
            ),
          ),
  );
  function apply(e: FormEvent) {
    e.preventDefault();
    try {
      query(draft);
      setFilters(draft);
      setPage(0);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h2>Transaction history</h2>
          <p>Filter by type and date to find what you need.</p>
        </div>
        <button
          className="button secondary"
          disabled={!data.data?.content.length}
          onClick={() => {
            csv(data.data!.content);
            notify("This page of transactions has been exported.");
          }}
        >
          <DownloadSimple size={17} />
          Export this page
        </button>
      </div>
      <form className="filters" onSubmit={apply}>
        <Field label="Transaction type">
          <select
            value={draft.type}
            onChange={(e) => setDraft({ ...draft, type: e.target.value })}
          >
            <option value="">All transactions</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="WITHDRAWAL">Withdrawals</option>
            <option value="TRANSFER">Transfers</option>
          </select>
        </Field>
        <Field label="From (UTC)">
          <input
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </Field>
        <Field label="Through (UTC)">
          <input
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </Field>
        <button className="button primary" type="submit">
          Apply filters
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            const cleared = { type: "", from: "", to: "" };
            setDraft(cleared);
            setFilters(cleared);
            setPage(0);
            setError("");
          }}
        >
          Reset
        </button>
      </form>
      {error && (
        <p className="form-error inset" role="alert">
          {error}
        </p>
      )}
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorPanel message={data.error} retry={data.reload} />
      ) : (
        data.data && (
          <>
            <TransactionTable
              transactions={data.data.content}
              account={account}
              onDetail={onDetail}
            />
            <Pager
              page={page}
              totalPages={data.data.page.totalPages}
              total={data.data.page.totalElements}
              onChange={setPage}
            />
          </>
        )
      )}
    </section>
  );
}
