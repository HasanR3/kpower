/**
 * Capture full-page screenshots of every main KPower screen.
 * Usage: PLAYWRIGHT_BASE_URL=http://localhost:1420 node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "..", "screenshots");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:1420";

const PAGES = [
  { id: "01-overview", label: "Overview" },
  { id: "02-device", label: "Device" },
  { id: "03-alarms", label: "Alarms" },
  { id: "04-schedule", label: "Schedule" },
  { id: "05-control", label: "Control" },
  { id: "06-history", label: "History" },
  { id: "07-settings", label: "Settings" },
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

console.log("open", baseURL);
await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.getByText("KPower").first().waitFor({ timeout: 20_000 });
await page.waitForTimeout(1200);

const nav = page.locator("nav.app-nav");

for (const { id, label } of PAGES) {
  await nav.locator(`button.nav-btn`, { hasText: label }).click();
  await page.waitForTimeout(1000);
  const file = path.join(outDir, `${id}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", path.basename(file));
}

await nav.locator("button.nav-btn", { hasText: "Device" }).click();
await page.waitForTimeout(600);
for (const tab of ["Mimic", "Data", "Dial"]) {
  const tabBtn = page.getByRole("tab", { name: tab });
  if ((await tabBtn.count()) > 0) {
    await tabBtn.first().click();
    await page.waitForTimeout(800);
    const file = path.join(outDir, `02-device-${tab.toLowerCase()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", path.basename(file));
  }
}

await browser.close();
console.log(`Done → ${outDir}`);
