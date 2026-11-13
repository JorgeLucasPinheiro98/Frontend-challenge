import { expect, test } from "@playwright/test"
import { loginAsDemoCollector, resetMockEnvironment } from "./helpers"

test.describe("Perfil e Gestão de Carteiras", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await resetMockEnvironment(page)
    await loginAsDemoCollector(page)
  })

  test("deve cadastrar nova carteira e defini-la como principal", async ({
    page,
  }) => {
    await page.getByRole("banner").getByRole("link", { name: /Carteiras/i }).click()
    await expect(page).toHaveURL(/\/wallets/)

    await page.getByLabel(/Apelido/i).fill("Cofre Ledger")
    await page
      .getByLabel(/Endereço/i)
      .fill("0x9999888877776666555544443333222211110000")
    await page.getByRole("checkbox").first().check()

    await page.locator('main form button[type="submit"]').click()

    await expect(page.getByText("Cofre Ledger", { exact: true })).toBeVisible()
  })
})