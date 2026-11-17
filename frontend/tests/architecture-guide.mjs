import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  ...(process.env.FINCORE_BROWSER_PATH
    ? { executablePath: process.env.FINCORE_BROWSER_PATH }
    : {}),
});
const guide = new URL("../../architecture.html", import.meta.url).href;
const artifacts = new URL("../artifacts/", import.meta.url);
await mkdir(fileURLToPath(artifacts), { recursive: true });
const errors = [],
  externalRequests = [];
let checks = 0;
const pass = (message) => {
  checks++;
  console.log("PASS: " + message);
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) externalRequests.push(r.url());
  });
  await page.goto(guide);
  await page.getByRole("heading", { name: /Understand the system/ }).waitFor();
  assert.equal(await page.locator(".chapter").count(), 9);
  assert.deepEqual(
    await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    }),
    [],
  );
  assert.deepEqual(
    await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .filter(
          (a) => !document.getElementById(a.getAttribute("href").slice(1)),
        )
        .map((a) => a.getAttribute("href")),
    ),
    [],
  );
  pass(
    "all nine chapters load directly from a local file; IDs and internal links are valid",
  );
  await page.screenshot({
    path: fileURLToPath(new URL("architecture-guide-desktop.png", artifacts)),
  });
  await page.locator('[data-layer="backend"]').click();
  assert.match(
    await page.locator("#layer-note").textContent(),
    /Spring Boot owns/,
  );
  assert.equal(await page.locator('.layer[aria-pressed="true"]').count(), 1);
  for (const [key, route] of [
    ["login", "/auth/login"],
    ["balance", "/accounts/me/balance"],
    ["deposit", "/admin/accounts/{accountId}/deposit"],
    ["transfer", "/transactions/transfer"],
  ]) {
    await page.locator(`[data-request="${key}"]`).click();
    assert.match(
      await page.locator("#request-route").textContent(),
      new RegExp(route.replace(/[{}]/g, "\\$&")),
    );
    assert.equal(await page.locator("#request-steps li").count(), 5);
  }
  pass("clickable system layers and four request walkthroughs work");
  await page.getByLabel("FIND A CONCEPT").fill("foreign key");
  await page.locator('#search-results a[href="#database"]').click();
  assert.equal(
    await page
      .locator("#search-results")
      .evaluate((e) => e.classList.contains("open")),
    false,
  );
  pass("concept search locates the database chapter and navigates to it");
  const next = page.locator("#sim-next");
  const step = async (count) => {
    for (let i = 0; i < count; i++) await next.click();
  };
  await page.locator("#sim-scenario").selectOption("success");
  await step(7);
  assert.equal(await page.locator("#sim-sender").textContent(), "$1,000.00");
  assert.match(
    await page.locator("#sim-pending").textContent(),
    /Pending proposal/,
  );
  await step(1);
  assert.equal(await page.locator("#sim-sender").textContent(), "$750.00");
  assert.equal(await page.locator("#sim-recipient").textContent(), "$450.00");
  assert.equal(await page.locator("#sim-records").textContent(), "1");
  pass("successful transfer keeps committed balances unchanged until commit");
  await page.locator("#sim-scenario").selectOption("insufficient");
  await step(6);
  assert.equal(await page.locator("#sim-sender").textContent(), "$1,000.00");
  assert.equal(await page.locator("#sim-records").textContent(), "0");
  assert.equal(await next.isDisabled(), true);
  pass("insufficient funds stops without a committed balance or record change");
  await page.locator("#sim-scenario").selectOption("rollback");
  await step(8);
  assert.equal(await page.locator("#sim-sender").textContent(), "$1,000.00");
  assert.equal(await page.locator("#sim-recipient").textContent(), "$200.00");
  assert.equal(await page.locator("#sim-records").textContent(), "0");
  pass("late failure rolls back both simulated balances and the record");
  await page.locator("#sim-scenario").selectOption("retry");
  await step(8);
  assert.equal(await next.textContent(), "Retry same request");
  await step(1);
  assert.equal(await page.locator("#sim-records").textContent(), "1");
  assert.equal(await page.locator("#sim-sender").textContent(), "$750.00");
  await page.locator(".simulation").screenshot({
    path: fileURLToPath(new URL("architecture-transfer-lab.png", artifacts)),
  });
  pass("lost response followed by retry does not duplicate a transfer");
  await page.locator("#sim-reset").click();
  await page.locator("#sim-amount").fill("0");
  await next.click();
  assert.match(
    await page.locator("#sim-title").textContent(),
    /Check the amount/,
  );
  assert.match(await page.locator("#sim-step").textContent(), /Step 0/);
  pass("the lab validates amounts before advancing");
  await page.locator("#expand-all").click();
  assert.equal(
    await page.locator("details").evaluateAll((ds) => ds.every((d) => d.open)),
    true,
  );
  await page.locator("#expand-all").click();
  assert.equal(
    await page.locator("details").evaluateAll((ds) => ds.every((d) => !d.open)),
    true,
  );
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  assert.equal(
    await page.locator("details").evaluateAll((ds) => ds.every((d) => d.open)),
    true,
  );
  await page.emulateMedia({ media: "print" });
  assert.equal(
    await page.locator(".rail").evaluate((e) => getComputedStyle(e).display),
    "none",
  );
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  pass("deep dives expand/collapse and print mode opens all explanations");
  await page.locator('#quiz-form input[name="authority"][value="0"]').check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  assert.match(await page.locator("#quiz-score").textContent(), /of 8 correct/);
  assert.equal(await page.locator(".answer-feedback.show").count(), 8);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  for (const [name, value] of [
    ["authority", 1],
    ["ids", 2],
    ["rollback", 1],
    ["retry", 0],
    ["session", 1],
    ["proxy", 2],
    ["money", 0],
    ["migration", 2],
  ])
    await page
      .locator(`#quiz-form input[name="${name}"][value="${value}"]`)
      .check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  assert.match(
    await page.locator("#quiz-score").textContent(),
    /^8 of 8 correct/,
  );
  assert.equal(await page.locator(".answer-feedback.correct").count(), 8);
  pass("the knowledge check scores answers, explains them, and resets");
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensions.scroll <= dimensions.viewport,
      `overflow at ${width}: ${JSON.stringify(dimensions)}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(guide);
  await page.screenshot({
    path: fileURLToPath(new URL("architecture-guide-mobile.png", artifacts)),
  });
  pass("document layout stays contained at 360/390/768/1024/1440 pixels");
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  pass(
    "no browser runtime errors and no HTTP/API requests while using the offline guide",
  );
  console.log(`${checks} architecture guide checks passed.`);
} finally {
  await browser.close();
}
