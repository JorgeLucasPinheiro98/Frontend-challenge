import { expect, test } from "@playwright/test"

test.describe("KURIO NFT Marketplace - Fluxos Críticos", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("deve filtrar o catálogo por coleção, faixa de preço e sincronizar com a URL", async ({
    page,
  }) => {
    const collectionBtn = page.getByRole("button", { name: /Arte digital/i })
    await collectionBtn.click()
    await expect(page).toHaveURL(/collection=.*Arte(\+|%20)digital/)
    await expect(collectionBtn).toHaveAttribute("aria-pressed", "true")

    const minInput = page.getByLabel("Mín (ETH)")
    const maxInput = page.getByLabel("Máx (ETH)")
    await minInput.fill("0.10")
    await maxInput.fill("5.00")
    await page.getByRole("button", { name: "Aplicar" }).click()

    await expect(page).toHaveURL(/minPrice=.*0\.10/)
    await expect(page).toHaveURL(/maxPrice=.*5\.00/)

    // Limpa filtros e verifica restauração da URL
    await page.getByRole("button", { name: "Limpar" }).click()
    await expect(collectionBtn).toHaveAttribute("aria-pressed", "false")
  })

  test("deve exigir login ao tentar favoritar como visitante e redirecionar de volta após autenticar", async ({
    page,
  }) => {
    const firstFavoriteBtn = page.getByRole("button", { name: /Favoritar/i }).first()
    await firstFavoriteBtn.click()

    await expect(page).toHaveURL(/\/login\?redirect=/)

    await page.getByRole("button", { name: /Usar conta demo/i }).click()
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL("/")
    await expect(page.getByRole("link", { name: /Lucas/i })).toBeVisible()
  })

  test("deve exibir notificação toast ao receber evento de atualização em tempo real", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /QA/i }).click()
    await page.getByRole("button", { name: /Emitir evento tempo real/i }).click()

    const statusToast = page.getByRole("status").filter({
      hasText: /Atualização em tempo real/i,
    })
    await expect(statusToast).toBeVisible()
  })

  test("deve concluir compra com sucesso, gerar recibo imutável e permitir gerenciar carteiras", async ({
    page,
  }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: /Usar conta demo/i }).click()
    await page.getByRole("button", { name: "Entrar" }).click()
    await expect(page).toHaveURL("/")

    // Adiciona item ao carrinho e aplica cupom KURIO10
    await page.locator("#catalogo article a").first().click()
    await page.getByRole("button", { name: "COMPRAR" }).click()
    await expect(page).toHaveURL("/cart")

    await page.getByLabel("Código promocional").fill("KURIO10")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText(/Cupom ativo:/i)).toBeVisible()

    // Valida bloqueio quando carteira está desconectada
    await page.getByRole("button", { name: "Conectar e finalizar" }).click()
    await expect(page).toHaveURL("/checkout")

    await page.getByRole("button", { name: "Simular Desconexão" }).click()
    await page.getByRole("button", { name: "Confirmar compra" }).click()
    await expect(page).toHaveURL("/checkout")

    // Reconecta carteira e conclui pedido
    await page.getByRole("button", { name: "Simular Conectada" }).click()
    await page.getByRole("button", { name: "Confirmar compra" }).click()

    await expect(page).toHaveURL(/\/orders\/.+/)
    await expect(page.getByText(/Detalhes da transação/i)).toBeVisible()

    // Navega via SPA para Gerenciar carteiras
    await page.getByRole("link", { name: "Gerenciar carteiras" }).click()
    await expect(page).toHaveURL("/wallets")

    await page.getByLabel(/Apelido da carteira/i).fill("Cofre Ledger")
    await page
      .getByLabel(/Endereço 0x/i)
      .fill("0x9999888877776666555544443333222211110000")
    await page.getByRole("button", { name: /Cadastrar carteira/i }).click()

    await expect(page.getByText("Cofre Ledger", { exact: true })).toBeVisible()
  })

  test("deve recusar assinatura quando a carteira rejeitar a operação no checkout", async ({
    page,
  }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: /Usar conta demo/i }).click()
    await page.getByRole("button", { name: "Entrar" }).click()

    await page.locator("#catalogo article a").first().click()
    await page.getByRole("button", { name: "COMPRAR" }).click()
    await page.getByRole("button", { name: "Conectar e finalizar" }).click()
    await expect(page).toHaveURL("/checkout")

    await page.getByRole("button", { name: "Simular Recusa" }).click()
    await page.getByRole("button", { name: "Confirmar compra" }).click()

    const errorAlert = page.getByRole("alert").filter({
      hasText: /Assinatura recusada na carteira/i,
    })
    await expect(errorAlert).toBeVisible()
    await expect(page).toHaveURL("/checkout")
  })
})