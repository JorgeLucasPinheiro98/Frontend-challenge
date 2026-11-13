import { expect, test } from "@playwright/test"
import { loginAsDemoCollector, resetMockEnvironment } from "./helpers"

test.describe("Checkout Idempotente, Resiliência e Tempo Real", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await resetMockEnvironment(page)
    await loginAsDemoCollector(page)
  })

  test("deve concluir compra, atualizar status via Socket.IO e decrementar estoque", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /Adicionar .* ao carrinho/i })
      .first()
      .click()

    await page.getByRole("banner").getByRole("link", { name: /Carrinho/i }).click()
    await page
      .getByRole("button", { name: /pagamento|checkout|finalizar/i })
      .click()

    await expect(page).toHaveURL(/\/checkout/)
    await page.getByRole("button", { name: /Confirmar compra/i }).click()

    await expect(page).toHaveURL(/\/orders\/ORD-/)

    // Aguarda transição em tempo real (pending -> confirmed) via Socket.IO
    // O link do explorador (etherscan.io) e o estado final só aparecem após confirmação
    await expect(
      page.getByRole("button", { name: "Ver no Etherscan" })
    ).toBeVisible({
      timeout: 8000,
    })
  })

  test("deve bloquear envio e exigir reconfirmação quando o preço mudar antes do checkout", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /Adicionar .* ao carrinho/i })
      .first()
      .click()

    await page.getByRole("banner").getByRole("link", { name: /Carrinho/i }).click()
    await page
      .getByRole("button", { name: /pagamento|checkout|finalizar/i })
      .click()

    await expect(page).toHaveURL(/\/checkout/)

    await page.evaluate(async () => {
      await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "price-change-checkout" }),
      })
    })

    await page.getByRole("button", { name: /Confirmar compra/i }).click()

    await expect(
      page.getByText(/Alteração detectada na cotação|cotação foram atualizados/i)
    ).toBeVisible()

    await page
      .getByRole("button", { name: /Aceitar novos valores|Atualizar cotação/i })
      .click()
    await page.getByRole("button", { name: /Confirmar compra/i }).click()

    await expect(page).toHaveURL(/\/orders\/ORD-/)
  })

  test("deve decrementar estoque e sincronizar vitrine após compra", async ({
    page,
  }) => {
    const firstCard = page.locator("#catalogo article").first()
    await expect(firstCard).toContainText("4 un.")

    // Realiza a compra do primeiro NFT
    await page
      .getByRole("button", { name: /Adicionar .* ao carrinho/i })
      .first()
      .click()
    await page.getByRole("banner").getByRole("link", { name: /Carrinho/i }).click()
    await page
      .getByRole("button", { name: /pagamento|checkout|finalizar/i })
      .click()
    await page.getByRole("button", { name: /Confirmar compra/i }).click()

    await expect(
      page.getByRole("button", { name: "Ver no Etherscan" })
    ).toBeVisible({
      timeout: 8000,
    })

    // Verifica na API do MSW que o estoque do nft-042 foi decrementado para 3
    const updatedQuantity = await page.evaluate(async () => {
      const res = await fetch("/api/nfts/nft-042")
      const json = await res.json()
      return json.availableQuantity ?? json.data?.availableQuantity
    })
    expect(updatedQuantity).toBe(3)

    // Volta para o catálogo e valida que o card reflete o estoque atualizado
    await page.getByRole("link", { name: "Continuar explorando" }).click()
    await page.getByRole("link", { name: "Emerald Ape #042" }).first().click()
    await expect(page).toHaveURL(/\/nfts\/nft-042/)
    await expect(page.locator("main")).toContainText("Disponibilidade atual: 3 unidade(s)")
  })
})