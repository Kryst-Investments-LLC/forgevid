import { expect, test } from "@playwright/test";

const locales = ["en", "es", "hi", "zh", "ja", "fr", "it", "ko", "pt", "de"];

test.describe("public platform audit", () => {
  for (const locale of locales) {
    test(`${locale} landing page renders and hydrates`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !message.text().includes("Failed to load resource: SSL connect error")
        ) {
          consoleErrors.push(message.text());
        }
      });

      const response = await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });

      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button").first()).toBeEnabled();
      expect(consoleErrors).toEqual([]);
    });
  }

  test("root landing page and navigation work", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("finished video");
    const pricingLink = page.locator('a[href="/pricing"]:visible').first();
    await expect(pricingLink).toBeVisible();
    await expect(pricingLink).toHaveAttribute("href", "/pricing");
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("health endpoint is healthy", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toMatch(/healthy|ok/i);
  });

  test("unknown locale returns not found", async ({ page }) => {
    const response = await page.goto("/xx");
    expect(response?.status()).toBe(404);
  });
});
