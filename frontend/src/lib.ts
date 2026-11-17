import type { Account, Filters, Page, Transaction } from "./types";
export const usd = (amount: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount));
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export const time = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
export function cents(value: string): bigint {
  if (!/^\d{1,17}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid amount with up to two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result <= 0n) throw new Error("Amount must be greater than zero.");
  return result;
}
export function validateAmount(value: string, maximum?: bigint): string {
  const parsed = cents(value);
  if (maximum !== undefined && parsed > maximum)
    throw new Error(
      `Amount cannot exceed ${usd((Number(maximum) / 100).toFixed(2))}.`,
    );
  return value;
}
export function query(filters: Filters, page = 0, size = 20) {
  if (filters.from && filters.to && filters.from > filters.to)
    throw new Error("Start date must be on or before end date.");
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", `${filters.from}T00:00:00Z`);
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    params.set("to", end.toISOString());
  }
  return `?${params}`;
}
export function normalizePage<T>(
  data:
    | Page<T>
    | (Partial<Page<T>> & {
        number: number;
        size: number;
        totalElements: number;
        totalPages: number;
      }),
): Page<T> {
  if (data.page) return data as Page<T>;
  const old = data as {
    content: T[];
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  return {
    content: old.content,
    page: {
      number: old.number,
      size: old.size,
      totalElements: old.totalElements,
      totalPages: old.totalPages,
    },
  };
}
export function incoming(tx: Transaction, account?: Account | null) {
  return (
    tx.type === "DEPOSIT" ||
    (!!account && tx.destinationAccountNumber === account.accountNumber)
  );
}
export function csv(rows: Transaction[]) {
  const escape = (value: string | number | null) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [
    [
      "Reference",
      "Type",
      "Amount USD",
      "Source account",
      "Destination account",
      "Date UTC",
    ],
    ...rows.map((t) => [
      t.reference,
      t.type,
      t.amount,
      t.sourceAccountNumber,
      t.destinationAccountNumber,
      t.createdAt,
    ]),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fincore-transactions.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
export class RequestIdentity {
  private signature = "";
  private key = "";
  for(payload: unknown) {
    const next = JSON.stringify(payload);
    if (next !== this.signature) {
      this.signature = next;
      this.key = crypto.randomUUID();
    }
    return this.key;
  }
}
