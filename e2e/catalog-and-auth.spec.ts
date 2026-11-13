import { expect, test } from "@playwright/test"
import { resetMockEnvironment } from "./helpers"

test.describe("Catálogo, Autenticação e Mesclagem de Carrinho", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await resetMockEnvironment(page)
    await page.reload()
  })

  test("deve filtrar catálogo por coleção e ordenar por preço", async ({
    page,
  }) => {
    await page
      .getByRole("complementary", { name: "Filtros do catálogo" })
      .getByRole("button", { name: /Arte digital/i })
      .click()

    await expect(page).toHaveURL(/collection=Arte\+digital|collection=Arte%20digital/)

    await page.getByLabel("Ordenar por:").selectOption("price_asc")
    await expect(page).toHaveURL(/sort=price_asc/)

    const articles = page.locator("#catalogo article")
    await expect(articles.first()).toBeVisible()
  })

  test("deve mesclar carrinho de visitante ao fazer login e redirecionar para o destino", async ({
    page,
  }) => {
    // 1. Adiciona item como visitante e aguarda confirmação da API
    const addResponse = page.waitForResponse(
      (res) => res.url().includes("/api/cart/items") && res.status() === 200
    )
    await page
      .getByRole("button", { name: /Adicionar .* ao carrinho/i })
      .first()
      .click()
    await addResponse

    // 2. Navega para o carrinho pelo cabeçalho e prossegue para checkout
    await page.getByRole("banner").getByRole("link", { name: /Carrinho/i }).click()
    await expect(page).toHaveURL(/\/cart/)
    await page
      .getByRole("button", { name: /pagamento|checkout|finalizar/i })
      .click()

    // 3. Redirecionado para /login com parâmetro redirect
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)

    // 4. Autentica com usuário padrão
    await page.getByLabel("E-mail", { exact: true }).fill("lucas@kurio.art")
    await page.getByLabel("Senha", { exact: true }).fill("Kurio@2026")
    await page.locator('main form button[type="submit"]').click()

    // 5. Retorna ao checkout com o item do visitante preservado
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByText("Seus NFTs")).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeEnabled()
  })
})