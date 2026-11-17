import type { Icon } from "@phosphor-icons/react";
import {
  ArrowClockwise,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUpRight,
  Bank,
  Clock,
  GearSix,
  List,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import { request } from "../api";
import { demoAccount, demoStats, demoTransactions } from "../data/demo";
import { useLoad } from "../hooks/useLoad";
import { initials, normalizePage } from "../lib";
import { AccountScreen } from "../pages/Account";
import { Accounts } from "../pages/Accounts";
import { Activity } from "../pages/Activity";
import { Customers } from "../pages/Customers";
import { Overview } from "../pages/Overview";
import { Profile } from "../pages/Profile";
import type {
  Account,
  Customer,
  Notify,
  Page,
  Session,
  Stats,
  Transaction,
  View,
} from "../types";
import type { MoneyKind } from "./MoneyDialog";
import MoneyDialog from "./MoneyDialog";
import { TransactionDetail } from "./TransactionDetail";
import { Badge, Brand, ErrorPanel, Loading } from "./ui";

const titles: Record<View, string> = {
  overview: "Overview",
  activity: "Transactions",
  account: "My account",
  customers: "Customers",
  accounts: "Accounts",
  profile: "Profile & settings",
};

export function Workspace({
  session,
  notify,
  onLogout,
}: {
  session: Session;
  notify: Notify;
  onLogout: () => void;
}) {
  const admin = session.customer.role === "ADMIN";
  const [view, setView] = useState<View>("overview");
  const [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0);
  const [money, setMoney] = useState<{
    kind: MoneyKind;
    account: Account | null;
  } | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const data = useLoad(
    `workspace-${session.customer.id}-${session.demo}-${revision}`,
    async () => {
      if (session.demo)
        return {
          customer: session.customer,
          account: admin ? null : demoAccount,
          stats: admin ? demoStats : null,
          transactions: demoTransactions,
        };
      const [customer, main, recent] = await Promise.all([
        request<Customer>("/customers/me", session.token),
        admin
          ? request<Stats>("/admin/statistics", session.token)
          : request<Account>("/accounts/me", session.token),
        request<Page<Transaction>>(
          `${admin ? "/admin/transactions" : "/transactions/me"}?page=0&size=100`,
          session.token,
        ),
      ]);
      return {
        customer,
        account: admin ? null : (main as Account),
        stats: admin ? (main as Stats) : null,
        transactions: normalizePage(recent).content,
      };
    },
  );
  const customer = data.data?.customer || session.customer;
  const account = data.data?.account || null;
  const active = customer.status === "APPROVED" && account?.status === "ACTIVE";
  const navigate = (next: View) => {
    setView(next);
    setMobile(false);
  };
  const refresh = () => setRevision((n) => n + 1);
  const openMoney = (kind: MoneyKind, target: Account | null = account) =>
    setMoney({ kind, account: target });
  const nav: { view: View; icon: Icon; label: string }[] = [
    { view: "overview", icon: SquaresFour, label: "Overview" },
    { view: "activity", icon: ArrowsLeftRight, label: "Transactions" },
    ...(admin
      ? [
          { view: "customers" as View, icon: Users, label: "Customers" },
          { view: "accounts" as View, icon: Bank, label: "Accounts" },
        ]
      : [{ view: "account" as View, icon: Wallet, label: "My account" }]),
  ];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="main-navigation"
        className={`sidebar ${mobile ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <Brand onHome={() => navigate("overview")} />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={21} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            {admin ? <Bank size={19} /> : <Wallet size={19} />}
          </span>
          <div>
            <b>{admin ? "FinCore workspace" : "Personal banking"}</b>
            <small>{admin ? "Administration" : "Your everyday account"}</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.view}
              className={`nav-item ${view === item.view ? "active" : ""}`}
              aria-current={view === item.view ? "page" : undefined}
              onClick={() => navigate(item.view)}
            >
              <item.icon
                size={21}
                weight={view === item.view ? "fill" : "regular"}
              />
              {item.label}
              {view === item.view && <span />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-assurance">
            <ShieldCheck size={26} />
            <b>A little peace of mind.</b>
            <p>
              Your balances and activity,
              <br />
              always in one place.
            </p>
            <span>EDUCATIONAL BANKING</span>
          </div>
          <button
            className={`nav-item ${view === "profile" ? "active" : ""}`}
            onClick={() => navigate("profile")}
          >
            <GearSix size={21} />
            Profile & settings
          </button>
          <button className="nav-item sign-out" onClick={onLogout}>
            <SignOut size={21} />
            {session.demo ? "Exit demo" : "Sign out"}
          </button>
          <button className="sidebar-user" onClick={() => navigate("profile")}>
            <span className="avatar">{initials(customer.fullName)}</span>
            <span>
              <b>{customer.fullName}</b>
              <small>{admin ? "Administrator" : "Personal account"}</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="main-navigation"
            >
              <List size={23} />
            </button>
            <span className="breadcrumb">
              Workspace<span>/</span>
              <b>{titles[view]}</b>
            </span>
          </div>
          <div>
            <span className="topbar-date">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
            <span className="topbar-divider" />
            <ShieldCheck size={18} className="teal" />
            <span className="topbar-status">
              {session.demo ? "Demo workspace" : "Signed in"}
            </span>
            <button
              className="avatar small-avatar"
              aria-label="Open your profile"
              onClick={() => navigate("profile")}
            >
              {initials(customer.fullName)}
            </button>
          </div>
        </header>
        {session.demo && (
          <div className="demo-banner">
            <span>
              <span className="demo-pill">DEMO</span>You’re viewing sample data.
              Transactions and account changes are disabled.
            </span>
            <button onClick={onLogout}>
              Sign in to your account
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <main id="main-content" tabIndex={-1} className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {admin ? "ADMINISTRATION" : "YOUR EVERYDAY BANKING"}
              </span>
              <h1>
                {view === "overview"
                  ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${customer.fullName.split(" ")[0]}.`
                  : titles[view]}
              </h1>
              <p>
                {view === "overview"
                  ? admin
                    ? "A clear view of your banking operations."
                    : "Here’s where things stand. Let’s make your next move."
                  : view === "activity"
                    ? "Every movement, all in one place."
                    : view === "customers"
                      ? "Review applications and get to know your customers."
                      : view === "accounts"
                        ? "Manage balances, deposits, and account access."
                        : view === "profile"
                          ? "The details that make this account yours."
                          : "Your account, at a glance."}
              </p>
            </div>
            <button
              className="button secondary refresh-button"
              onClick={refresh}
              disabled={data.loading}
            >
              <ArrowClockwise size={17} />
              Refresh
            </button>
          </div>
          {!admin && customer.status !== "APPROVED" && (
            <div
              className={`application-banner ${customer.status === "REJECTED" ? "rejected-banner" : ""}`}
            >
              <Clock size={22} />
              <div>
                <b>
                  {customer.status === "PENDING"
                    ? "Your application is being reviewed."
                    : "Your application was not approved."}
                </b>
                <p>
                  {customer.status === "PENDING"
                    ? "You can explore your account. Transfers and withdrawals become available after approval."
                    : "Your account is available to view, but financial operations are unavailable."}
                </p>
              </div>
              <Badge value={customer.status} />
            </div>
          )}
          {view === "overview" ? (
            data.loading ? (
              <Loading />
            ) : data.error ? (
              <ErrorPanel message={data.error} retry={refresh} />
            ) : (
              data.data && (
                <Overview
                  admin={admin}
                  account={account}
                  stats={data.data.stats}
                  transactions={data.data.transactions}
                  active={!!active}
                  onMoney={openMoney}
                  navigate={navigate}
                  onDetail={setDetail}
                />
              )
            )
          ) : view === "activity" ? (
            <Activity
              session={session}
              account={account}
              revision={revision}
              onDetail={setDetail}
              notify={notify}
            />
          ) : view === "customers" ? (
            <Customers
              session={session}
              revision={revision}
              onChange={refresh}
              notify={notify}
            />
          ) : view === "accounts" ? (
            <Accounts
              session={session}
              revision={revision}
              onChange={refresh}
              onDeposit={(a) => openMoney("deposit", a)}
              notify={notify}
            />
          ) : view === "account" ? (
            data.loading ? (
              <Loading />
            ) : data.error ? (
              <ErrorPanel message={data.error} retry={refresh} />
            ) : (
              account && (
                <AccountScreen
                  account={account}
                  notify={notify}
                  active={!!active}
                  onMoney={openMoney}
                />
              )
            )
          ) : (
            <Profile
              session={session}
              customer={customer}
              notify={notify}
              onChange={refresh}
            />
          )}
          <footer className="workspace-footer">
            <span>
              <span className="footer-dot" />
              All amounts in USD
              <span className="footer-separator">&middot;</span>Transaction
              dates use UTC
            </span>
            <span>
              FinCore<span className="footer-separator">/</span>Educational
              banking simulation
            </span>
          </footer>
        </main>
      </div>
      <nav
        className={`bottom-nav ${mobile ? "drawer-open" : ""}`}
        aria-label="Mobile banking navigation"
      >
        {(admin
          ? [nav[0], nav[2], nav[3], nav[1]]
          : [
              ...nav,
              { view: "profile" as View, icon: GearSix, label: "Profile" },
            ]
        ).map((item) => (
          <button
            key={item.view}
            className={view === item.view ? "selected" : ""}
            aria-current={view === item.view ? "page" : undefined}
            onClick={() => navigate(item.view)}
          >
            <item.icon
              size={21}
              weight={view === item.view ? "fill" : "regular"}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {money && (
        <MoneyDialog
          session={session}
          kind={money.kind}
          account={money.account}
          onClose={() => setMoney(null)}
          onComplete={refresh}
        />
      )}{" "}
      {detail !== null && (
        <TransactionDetail
          session={session}
          id={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
