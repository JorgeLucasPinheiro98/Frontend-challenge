import { expect, type Page } from "@playwright/test"

export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: "commit" })
}

export async function navigateSpa(page: Page, path: string) {
  await page.evaluate((targetPath) => {
    window.history.pushState({}, "", targetPath)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, path)
}

export async function resetMockEnvironment(
  page: Page,
  scenario:
    | "default"
    | "slow"
    | "empty"
    | "network-error"
    | "price-change-checkout"
    | "out-of-stock-checkout"
    | "payment-rejected"
    | "order-timeout-recovery"
    | "session-expired" = "default",
  latencyMs = 50
) {
  await page.evaluate(
    async ({ targetScenario, targetLatency }) => {
      localStorage.clear()
      await fetch("/api/mock/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: targetScenario,
          latencyMs: targetLatency,
        }),
      })
    },
    { targetScenario: scenario, targetLatency: latencyMs }
  )
}

export async function loginAsDemoCollector(
  page: Page,
  credentials = { email: "lucas@kurio.art", password: "Kurio@2026" }
) {
  await navigateSpa(page, "/login")
  await page.getByLabel("E-mail", { exact: true }).fill(credentials.email)
  await page.getByLabel("Senha", { exact: true }).fill(credentials.password)
  await page.locator('main form button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/)
}