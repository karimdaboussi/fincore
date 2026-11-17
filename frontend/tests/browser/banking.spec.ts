import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const customer = {
  id: 1,
  fullName: "Karim Customer",
  email: "karim@example.com",
  role: "CUSTOMER",
  status: "APPROVED",
  createdAt: "2026-11-01T12:00:00Z",
};
const account = {
  id: 1,
  accountNumber: "ACC123456789",
  balance: 1000,
  currency: "USD",
  status: "ACTIVE",
};
const tx = {
  id: 1,
  reference: "TXN-browser-test",
  sourceAccountNumber: null,
  destinationAccountNumber: account.accountNumber,
  amount: 1000,
  type: "DEPOSIT",
  status: "COMPLETED",
  createdAt: new Date().toISOString(),
};
const paged = (content: unknown[]) => ({
  content,
  page: {
    number: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
  },
});
async function fixture(page: Page, admin = false) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let json: unknown;
    if (path.endsWith("/auth/login"))
      json = {
        accessToken: "test-token",
        expiresIn: 3600,
        tokenType: "Bearer",
        customer: { ...customer, role: admin ? "ADMIN" : "CUSTOMER" },
      };
    else if (path.endsWith("/customers/me"))
      json = { ...customer, role: admin ? "ADMIN" : "CUSTOMER" };
    else if (path.endsWith("/accounts/me")) json = account;
    else if (path.endsWith("/statistics"))
      json = {
        customers: 2,
        accounts: 1,
        transactions: 1,
        totalBalanceUSD: 1000,
      };
    else if (path.endsWith("/admin/customers"))
      json = paged([{ ...customer, status: "PENDING" }]);
    else if (path.endsWith("/admin/accounts")) json = paged([account]);
    else if (
      path.endsWith("/transactions/me") ||
      path.endsWith("/admin/transactions")
    )
      json = paged([tx]);
    else if (path.endsWith("/auth/register"))
      json = { ...customer, status: "PENDING" };
    else json = tx;
    await route.fulfill({ json });
  });
}
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill("karim@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("CustomerPassword123!");
  await page.getByRole("button", { name: "Sign in to FinCore" }).click();
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
}
test("authentication screen, customer demo, transaction details and profile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/sign-in.png", fullPage: true });
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page.getByText("$12,485.75").first()).toBeVisible();
  await page.screenshot({
    path: "artifacts/customer-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "View all activity" }).click();
  await expect(
    page.getByRole("heading", { name: "Transaction history" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /View transaction/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Profile & settings", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
});
test("real login attaches authorization and transfer retries keep the same key", async ({
  page,
}) => {
  await fixture(page);
  let failures = 0;
  const keys: string[] = [];
  await page.route("**/api/v1/transactions/transfer", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    const body = route.request().postDataJSON();
    expect(body).toEqual({
      destinationAccountNumber: "ACCDESTINATION",
      amount: "125.50",
    });
    keys.push(route.request().headers()["idempotency-key"]);
    if (!failures++)
      await route.fulfill({
        status: 503,
        json: { detail: "Uncertain response. Retry the same request." },
      });
    else
      await route.fulfill({
        json: {
          ...tx,
          amount: 125.5,
          type: "TRANSFER",
          reference: "TXN-transfer-retry",
        },
      });
  });
  await login(page);
  await page.getByRole("button", { name: /Send money/ }).click();
  await page.getByLabel("Recipient account number").fill("ACCDESTINATION");
  await page.getByLabel("Amount in USD").fill("125.50");
  await page.getByRole("button", { name: "Review transfer" }).click();
  await expect(page.getByRole("dialog").getByText("$125.50")).toBeVisible();
  await page.getByRole("button", { name: "Confirm transfer" }).click();
  await expect(
    page.getByRole("button", { name: "Retry same request" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry same request" }).click();
  await expect(page.getByText("Sent successfully")).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});
test("administrator approvals and deposits use the selected account ID", async ({
  page,
}) => {
  await fixture(page, true);
  const calls: string[] = [];
  await page.route("**/api/v1/admin/customers/1/approve", async (route) => {
    calls.push(route.request().method());
    await route.fulfill({ json: customer });
  });
  await login(page);
  await page.getByRole("button", { name: "Customers", exact: true }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("button", { name: "Approve customer" }).click();
  await expect(page.getByText("Customer application approved.")).toBeVisible();
  expect(calls).toEqual(["PATCH"]);
  await page.getByRole("button", { name: "Accounts", exact: true }).click();
  await page.getByRole("button", { name: "Deposit", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("ACC123456789"),
  ).toBeVisible();
  await page.getByLabel("Amount in USD").fill("10000.01");
  await page.getByRole("button", { name: "Review deposit" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot exceed");
});
test("admin demo is read-only and responsive mobile navigation works", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace at a glance" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/admin-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Customers", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Approve customer" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/mobile-dashboard.png",
    fullPage: true,
  });
});
test("history filters generate inclusive UTC date ranges", async ({ page }) => {
  await fixture(page);
  await login(page);
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await page.getByLabel("From (UTC)").fill("2026-11-01");
  await page.getByLabel("Through (UTC)").fill("2026-11-16");
  await page.getByLabel("Transaction type").selectOption("TRANSFER");
  const call = page.waitForRequest(
    (r) => r.url().includes("from=") && r.url().includes("/transactions/me"),
  );
  await page.getByRole("button", { name: "Apply filters" }).click();
  const request = await call;
  const params = new URL(request.url()).searchParams;
  expect(params.get("to")).toBe("2026-11-17T00:00:00.000Z");
  expect(params.get("type")).toBe("TRANSFER");
});
test("a rejected session returns safely to sign in", async ({ page }) => {
  await fixture(page);
  await login(page);
  await page.route("**/api/v1/transactions/me**", (route) =>
    route.fulfill({ status: 401, json: {} }),
  );
  await page.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(
    page.getByText("Your session has expired. Please sign in again."),
  ).toBeVisible();
});

test("reference-style balance privacy and account overview stay functional", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Account overview", exact: true }),
  ).toBeVisible();
  const amount = page.locator(".balance-number");
  await expect(amount).toContainText("$12,485.75");
  await page.getByRole("button", { name: "Hide available balance" }).click();
  await expect(amount).toContainText("Hidden");
  await expect(amount).not.toContainText("12,485.75");
  await page.getByRole("button", { name: "Show available balance" }).click();
  await expect(amount).toContainText("$12,485.75");
  await page.getByRole("button", { name: /Personal USD account/ }).click();
  await expect(
    page.getByRole("heading", { name: "Everyday USD account" }),
  ).toBeVisible();
  await expect(page.getByText("ACC8F3A1094C2E74B")).toBeVisible();
});

test("mobile bottom navigation reaches banking tasks without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const nav = page.getByRole("navigation", {
    name: "Mobile banking navigation",
  });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button")).toHaveCount(4);
  await nav.getByRole("button", { name: "Transactions", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transaction history" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "My account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Everyday USD account" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Personal details" }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Overview", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/mobile-customer-dashboard.png",
    fullPage: true,
  });
});
