import { Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { request } from "../api";
import { ConfirmAction } from "../components/ConfirmAction";
import { Badge, Empty, ErrorPanel, Loading, Pager } from "../components/ui";
import { demoCustomers, demoPage } from "../data/demo";
import { useLoad } from "../hooks/useLoad";
import { date, initials, label, normalizePage } from "../lib";
import type { Customer, Notify, Page, Session } from "../types";

export function Customers({
  session,
  revision,
  onChange,
  notify,
}: {
  session: Session;
  revision: number;
  onChange: () => void;
  notify: Notify;
}) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<{
    customer: Customer;
    approve: boolean;
  } | null>(null);
  const data = useLoad(`customers-${page}-${revision}`, async () =>
    session.demo
      ? demoPage(demoCustomers, page)
      : normalizePage(
          await request<Page<Customer>>(
            `/admin/customers?page=${page}&size=20`,
            session.token,
          ),
        ),
  );
  const rows = (data.data?.content || []).filter((c) =>
    `${c.fullName} ${c.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <section className="panel">
        <div className="section-title">
          <div>
            <h2>Customer directory</h2>
            <p>Review pending applications and customer details.</p>
          </div>
          <span className="subtle-tag">
            {data.data?.page.totalElements ?? "?"} CUSTOMERS
          </span>
        </div>
        <div className="directory-toolbar">
          <label className="search-field">
            <MagnifyingGlass size={18} />
            <input
              aria-label="Search customers on this page"
              placeholder="Search this page by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">
            {data.data?.content.filter((c) => c.status === "PENDING").length ||
              0}{" "}
            pending on this page
          </span>
        </div>
        {data.loading ? (
          <Loading />
        ) : data.error ? (
          <ErrorPanel message={data.error} retry={data.reload} />
        ) : (
          <>
            {rows.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th className="align-right">Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="customer-name">
                            <span className="avatar">
                              {initials(c.fullName)}
                            </span>
                            <span>
                              <b>{c.fullName}</b>
                              <small>{c.email}</small>
                            </span>
                          </div>
                        </td>
                        <td>{date(c.createdAt)}</td>
                        <td>
                          <Badge value={c.status} />
                        </td>
                        <td>{label(c.role)}</td>
                        <td>
                          <div className="row-actions">
                            {c.status === "PENDING" && c.role === "CUSTOMER" ? (
                              <>
                                <button
                                  className="button compact secondary"
                                  onClick={() =>
                                    setDecision({ customer: c, approve: false })
                                  }
                                >
                                  Reject
                                </button>
                                <button
                                  className="button compact primary"
                                  onClick={() =>
                                    setDecision({ customer: c, approve: true })
                                  }
                                >
                                  Approve
                                  <Check size={15} />
                                </button>
                              </>
                            ) : (
                              <span className="muted">Reviewed</span>
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
                title="No customers found"
                description={
                  search
                    ? "Try another name or clear the search."
                    : "New customer applications will appear here."
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
      {decision && (
        <ConfirmAction
          title={`${decision.approve ? "Approve" : "Reject"} application?`}
          description={`${decision.customer.fullName} ? ${decision.customer.email}`}
          detail={
            decision.approve
              ? "Approval enables this customer to send money, withdraw, and receive funds."
              : "This decision rejects the application. Financial operations will remain unavailable. Application decisions cannot be reversed through this interface."
          }
          button={decision.approve ? "Approve customer" : "Reject application"}
          danger={!decision.approve}
          session={session}
          onClose={() => setDecision(null)}
          onConfirm={async () => {
            await request(
              `/admin/customers/${decision.customer.id}/${decision.approve ? "approve" : "reject"}`,
              session.token,
              { method: "PATCH" },
            );
            notify(
              decision.approve
                ? "Customer application approved."
                : "Customer application rejected.",
            );
            onChange();
          }}
        />
      )}
    </>
  );
}
