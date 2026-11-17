export type Role = "CUSTOMER" | "ADMIN";
export type CustomerStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
export interface Customer {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: CustomerStatus;
  createdAt: string;
}
export interface Account {
  id: number;
  accountNumber: string;
  balance: number;
  currency: string;
  status: AccountStatus;
}
export interface Transaction {
  id: number;
  reference: string;
  sourceAccountNumber: string | null;
  destinationAccountNumber: string | null;
  amount: number;
  type: TransactionType;
  status: string;
  createdAt: string;
}
export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
export interface Login {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  customer: Customer;
}
export interface Session {
  token: string;
  customer: Customer;
  expiresAt: number;
  demo: boolean;
}
export interface Stats {
  customers: number;
  accounts: number;
  transactions: number;
  totalBalanceUSD: number;
}
export type View =
  | "overview"
  | "activity"
  | "account"
  | "customers"
  | "accounts"
  | "profile";
export interface Filters {
  type: string;
  from: string;
  to: string;
}

export type Notify = (message: string, error?: boolean) => void;
