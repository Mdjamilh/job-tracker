import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const password = "e2e password 1234";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function signUp(page: Page, email = uniqueEmail()) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Playwright User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  // The first request boots the embedded database and seeds the demo, so allow extra time.
  await expect(page).toHaveURL(/\/board$/, { timeout: 20_000 });
  return email;
}

async function addApplication(page: Page, company: string, role: string) {
  await page.getByRole("link", { name: "Add application" }).click();
  await page.getByLabel("Company").fill(company);
  await page.getByLabel("Role").fill(role);
  await page.getByLabel("Job posting link").fill("https://example.com/jobs/42");
  await page.getByLabel("Minimum").fill("95000");
  await page.getByLabel("Maximum").fill("120000");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("heading", { level: 1, name: company })).toBeVisible();
}

test("sign up, add, move on the board, see the timeline and export CSV", async ({ page }) => {
  await signUp(page);
  await expect(page.getByTestId("board-card")).toHaveCount(0);

  await addApplication(page, "Playwright Inc", "QA Engineer");
  await expect(page.getByTestId("timeline")).toContainText("Added as Wishlist");

  await page.getByRole("link", { name: "Board", exact: true }).click();
  const card = page.getByTestId("board-card").filter({ hasText: "Playwright Inc" });
  await expect(page.getByTestId("column-wishlist")).toContainText("Playwright Inc");

  // Keyboard-friendly path: the card's "Move to" menu.
  await card.getByLabel("Move Playwright Inc to").selectOption("applied");
  await expect(page.getByTestId("board-status")).toHaveText("Moved Playwright Inc to Applied.");
  await expect(page.getByTestId("column-applied")).toContainText("Playwright Inc");

  // Mouse path: native drag and drop to the next column.
  await card.dragTo(page.getByTestId("column-interview"));
  await expect(page.getByTestId("board-status")).toHaveText("Moved Playwright Inc to Interview.");
  await expect(page.getByTestId("column-interview")).toContainText("Playwright Inc");

  // The change is persisted and recorded on the timeline.
  await page.reload();
  await expect(page.getByTestId("column-interview")).toContainText("Playwright Inc");
  await card.getByRole("link", { name: "Playwright Inc" }).click();
  const timeline = page.getByTestId("timeline");
  await expect(timeline).toContainText("Wishlist to Applied");
  await expect(timeline).toContainText("Applied to Interview");

  await page.getByRole("link", { name: "Table", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^job-applications-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain("Company,Role,Status");
  expect(csv).toContain("Playwright Inc,QA Engineer,Interview");
  expect(csv.split("\r\n").filter(Boolean)).toHaveLength(2);
});

test("the board refuses a move the rules don't allow", async ({ page }) => {
  await signUp(page);
  await addApplication(page, "Backwards Ltd", "Engineer");
  await page.getByRole("link", { name: "Board", exact: true }).click();
  const card = page.getByTestId("board-card").filter({ hasText: "Backwards Ltd" });

  // Wishlist can't go straight to rejected: the menu doesn't offer it...
  const menu = card.getByLabel("Move Backwards Ltd to");
  await expect(menu.locator("option", { hasText: "Rejected" })).toHaveCount(0);
  // ...and a drop on that column is ignored.
  await card.dragTo(page.getByTestId("column-rejected"));
  await expect(page.getByTestId("column-wishlist")).toContainText("Backwards Ltd");
});

test("a user cannot open another user's application", async ({ page, browser }) => {
  await signUp(page);
  await addApplication(page, "Private Corp", "Secret Role");
  const privateUrl = page.url();

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signUp(otherPage);
  const response = await otherPage.goto(privateUrl);
  expect(response?.status()).toBe(404);
  await expect(otherPage.getByText("Private Corp")).toHaveCount(0);

  const csv = await otherPage.request.get("/export");
  expect(await csv.text()).not.toContain("Private Corp");
  await other.close();
});

test("logged-out visitors are sent to log in, and export is refused", async ({ page }) => {
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/export")).status()).toBe(401);
});

test("the demo account logs in with the credentials on the page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("note")).toContainText("data lives in memory");
  const email = await page.getByTestId("demo-email").innerText();
  const pw = await page.getByTestId("demo-password").innerText();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByTestId("board-card").first()).toBeVisible();

  await page.getByRole("link", { name: /Reminders/ }).click();
  await expect(page.getByTestId("reminders").getByRole("listitem").first()).toBeVisible();
  await page.getByRole("link", { name: "Stats" }).click();
  await expect(page.getByTestId("funnel-tracked")).not.toHaveText("0");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/board");
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows a generic error", async ({ page }) => {
  const email = await signUp(page);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not the password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "incorrect" })).toHaveText("Email or password is incorrect.");
});
