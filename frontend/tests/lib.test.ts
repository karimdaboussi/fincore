import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cents,
  validateAmount,
  query,
  normalizePage,
  RequestIdentity,
} from "../src/lib.ts";
test("amounts are converted to exact cents without floating point errors", () => {
  assert.equal(cents("0.29"), 29n);
  assert.equal(cents("5000"), 500000n);
  assert.equal(cents("99999999999999999.99"), 9999999999999999999n);
});
test("rejects nonpositive, fractional-cent and malformed amounts", () => {
  for (const value of [
    "0",
    "-1",
    "0.001",
    "1e3",
    "NaN",
    "",
    "100000000000000000",
  ])
    assert.throws(() => cents(value));
});
test("enforces operation-specific monetary limits", () => {
  assert.equal(validateAmount("10000", 1000000n), "10000");
  assert.throws(() => validateAmount("10000.01", 1000000n));
});
test("inclusive date selections become correct exclusive UTC API ranges", () => {
  const params = new URLSearchParams(
    query({ type: "TRANSFER", from: "2026-12-31", to: "2026-12-31" }),
  );
  assert.equal(params.get("from"), "2026-12-31T00:00:00Z");
  assert.equal(params.get("to"), "2027-01-01T00:00:00.000Z");
});
test("rejects reversed date filters", () =>
  assert.throws(() =>
    query({ type: "", from: "2026-12-02", to: "2026-12-01" }),
  ));
test("accepts stable DTO pagination and earlier PageImpl responses", () => {
  const expected = {
    content: [1],
    page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
  };
  assert.deepEqual(normalizePage(expected), expected);
  assert.deepEqual(
    normalizePage({
      content: [1],
      number: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    }),
    expected,
  );
});
test("the same request keeps its idempotency key; changed payloads get a new one", () => {
  const identity = new RequestIdentity();
  const key = identity.for({ amount: "12.50" });
  assert.equal(identity.for({ amount: "12.50" }), key);
  assert.notEqual(identity.for({ amount: "13.50" }), key);
});
