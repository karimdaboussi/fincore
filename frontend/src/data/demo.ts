import type {
  Account,
  Customer,
  Filters,
  Page,
  Session,
  Stats,
  Transaction,
} from "../types";
const stamp = (days: number, hours = 12) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hours, 24, 0, 0);
  return d.toISOString();
};
export const demoCustomer: Customer = {
  id: 1,
  fullName: "Alex Morgan",
  email: "alex@example.com",
  role: "CUSTOMER",
  status: "APPROVED",
  createdAt: stamp(120),
};
export const demoAccount: Account = {
  id: 1,
  accountNumber: "ACC8F3A1094C2E74B",
  balance: 12485.75,
  currency: "USD",
  status: "ACTIVE",
};
export const demoCustomers: Customer[] = [
  demoCustomer,
  {
    id: 2,
    fullName: "Jordan Lee",
    email: "jordan@example.com",
    role: "CUSTOMER",
    status: "PENDING",
    createdAt: stamp(1),
  },
  {
    id: 3,
    fullName: "Sam Rivera",
    email: "sam@example.com",
    role: "CUSTOMER",
    status: "APPROVED",
    createdAt: stamp(42),
  },
  {
    id: 4,
    fullName: "Taylor Chen",
    email: "taylor@example.com",
    role: "CUSTOMER",
    status: "PENDING",
    createdAt: stamp(0),
  },
];
export const demoAccounts: Account[] = [
  demoAccount,
  {
    id: 2,
    accountNumber: "ACC6B27DA4F1E90C3",
    balance: 0,
    currency: "USD",
    status: "ACTIVE",
  },
  {
    id: 3,
    accountNumber: "ACC12A9E55BC786D4",
    balance: 3820,
    currency: "USD",
    status: "FROZEN",
  },
];
export const demoTransactions: Transaction[] = [
  [1, "DEPOSIT", 2500, null, demoAccount.accountNumber, 0],
  [2, "TRANSFER", 180, demoAccount.accountNumber, "ACC6B27DA4F1E90C3", 0],
  [3, "WITHDRAWAL", 120, demoAccount.accountNumber, null, 1],
  [4, "TRANSFER", 450, "ACC12A9E55BC786D4", demoAccount.accountNumber, 2],
  [5, "TRANSFER", 75.5, demoAccount.accountNumber, "ACC6B27DA4F1E90C3", 3],
  [6, "DEPOSIT", 1200, null, demoAccount.accountNumber, 4],
  [7, "WITHDRAWAL", 250, demoAccount.accountNumber, null, 5],
  [8, "TRANSFER", 320, demoAccount.accountNumber, "ACC6B27DA4F1E90C3", 6],
].map(([id, type, amount, source, destination, days]) => ({
  id: Number(id),
  reference: `TXN-7e89c14f-2a0${id}-487d-b${id}02`,
  type: type as Transaction["type"],
  amount: Number(amount),
  sourceAccountNumber: source as string | null,
  destinationAccountNumber: destination as string | null,
  createdAt: stamp(Number(days), 15 - Number(id)),
  status: "COMPLETED",
}));
export const demoStats: Stats = {
  customers: 4,
  accounts: 3,
  transactions: 8,
  totalBalanceUSD: 16305.75,
};
export function demoSession(admin = false): Session {
  return {
    token: "",
    demo: true,
    expiresAt: Date.now() + 3600000,
    customer: admin
      ? { ...demoCustomer, id: 99, fullName: "Alex Morgan", role: "ADMIN" }
      : demoCustomer,
  };
}
export function demoPage<T>(rows: T[], page = 0, size = 20): Page<T> {
  return {
    content: rows.slice(page * size, (page + 1) * size),
    page: {
      number: page,
      size,
      totalElements: rows.length,
      totalPages: Math.ceil(rows.length / size),
    },
  };
}
export function filterDemo(filters: Filters) {
  return demoTransactions.filter(
    (t) =>
      (!filters.type || t.type === filters.type) &&
      (!filters.from || t.createdAt.slice(0, 10) >= filters.from) &&
      (!filters.to || t.createdAt.slice(0, 10) <= filters.to),
  );
}
