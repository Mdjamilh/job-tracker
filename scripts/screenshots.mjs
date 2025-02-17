// Captures README screenshots by logging in to the demo account.
// Usage: node scripts/screenshots.mjs http://localhost:47260
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:47260";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 });

await page.goto(`${base}/login`);
await page.getByLabel("Email").fill(await page.getByTestId("demo-email").innerText());
await page.getByLabel("Password").fill(await page.getByTestId("demo-password").innerText());
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL(/\/board$/, { timeout: 30_000 });

await page.getByTestId("board-card").first().waitFor();
await page.screenshot({ path: "docs/board.png", fullPage: true });
await page.goto(`${base}/stats`);
await page.getByRole("heading", { name: "Funnel" }).waitFor();
await page.screenshot({ path: "docs/stats.png" });
await page.goto(`${base}/applications?sort=appliedOn&dir=desc`);
await page.getByRole("table").waitFor();
await page.screenshot({ path: "docs/table.png" });

await browser.close();
console.log("Saved docs/board.png, docs/stats.png, docs/table.png");
