import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, onSessionExpired, request } from "../src/api.ts";

async function withFetch(mock: typeof fetch, check: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await check();
  } finally {
    globalThis.fetch = original;
  }
}

test("API client sends authentication and exact JSON amounts", async () => {
  await withFetch(
    async (url, options) => {
      assert.equal(url, "/api/v1/transactions/transfer");
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer test-token");
      assert.equal(headers["Idempotency-Key"], "retry-key");
      assert.deepEqual(JSON.parse(options?.body as string), { amount: "0.29" });
      return Response.json({ reference: "TXN-test" });
    },
    async () => {
      const result = await request<{ reference: string }>(
        "/transactions/transfer",
        "test-token",
        { method: "POST", body: { amount: "0.29" }, key: "retry-key" },
      );
      assert.equal(result.reference, "TXN-test");
    },
  );
});

test("malformed financial success remains uncertain rather than pretending success", async () => {
  await withFetch(
    async () => new Response("not-json", { status: 200 }),
    async () => {
      await assert.rejects(
        request("/transactions/withdraw", "test-token", {
          method: "POST",
          body: { amount: "1.00" },
          key: "same-key",
        }),
        (e) => e instanceof ApiError && e.status === 200 && e.uncertain,
      );
    },
  );
});

test("network failure retains the uncertain financial outcome", async () => {
  await withFetch(
    async () => {
      throw new TypeError("connection interrupted");
    },
    async () => {
      await assert.rejects(
        request("/transactions/transfer", "test-token", { key: "same-key" }),
        (e) => e instanceof ApiError && e.status === 0 && e.uncertain,
      );
    },
  );
});

test("expired-session handlers can be disposed without clearing a newer handler", async () => {
  let oldCalls = 0,
    newCalls = 0;
  const disposeOld = onSessionExpired(() => oldCalls++);
  const disposeNew = onSessionExpired(() => newCalls++);
  disposeOld();
  await withFetch(
    async () => new Response(null, { status: 401 }),
    async () => {
      await assert.rejects(request("/accounts/me", "test-token"), ApiError);
      assert.equal(oldCalls, 0);
      assert.equal(newCalls, 1);
      disposeNew();
      await assert.rejects(request("/accounts/me", "test-token"), ApiError);
      assert.equal(newCalls, 1);
    },
  );
});

test("business failures preserve their safe server message and are not marked uncertain", async () => {
  await withFetch(
    async () =>
      Response.json({ detail: "Insufficient balance" }, { status: 400 }),
    async () => {
      await assert.rejects(
        request("/transactions/withdraw", "test-token", { key: "request-key" }),
        (e) =>
          e instanceof ApiError &&
          e.message === "Insufficient balance" &&
          !e.uncertain,
      );
    },
  );
});
