import { expect, test } from "@playwright/test";

test.describe("KPower monitoring smoke", () => {
  test("Overview loads with brand and monitoring console", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("KPower").first()).toBeVisible();
    await expect(page.getByText(/Monitoring console|Power infrastructure|Local UPS/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Device page opens from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Device$/i }).click();
    await expect(page.getByRole("tab", { name: /Mimic|Data|Dial/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Settings exposes Allow control", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Settings$/i }).click();
    await expect(page.getByText(/Allow control/i)).toBeVisible({ timeout: 10_000 });
  });
});
