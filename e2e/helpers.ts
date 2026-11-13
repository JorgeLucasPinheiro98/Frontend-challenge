import { expect, type Page } from "@playwright/test"

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

export async function loginAsDemoCollector(page: Page) {
  await page.goto("/login")

  const demoFillBtn = page.getByRole("button", {
    name: /demonstração|demo|preencher/i,
  })
  if (await demoFillBtn.isVisible()) {
    await demoFillBtn.click()
  } else {
    await page.getByLabel("E-mail", { exact: true }).fill("lucas@kurio.art")
    await page.getByLabel("Senha", { exact: true }).fill("Kurio@2026")
  }

  await page.locator('main form button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/login/)
}