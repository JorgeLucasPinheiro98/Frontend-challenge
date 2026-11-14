import { expect, test } from "@playwright/test"
import {
  gotoApp,
  loginAsDemoCollector,
  navigateSpa,
  resetMockEnvironment,
} from "./helpers"

test.describe("Resiliência, Sessão, Tempo Real Avançado e Regressão Visual", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, "/")
    await resetMockEnvironment(page)
  })

  test("deve restaurar filtros/paginação pelo histórico e tratar NFT inexistente", async ({
    page,
  }) => {
    await navigateSpa(page, "/?collection=Arte+digital&sort=price_asc&page=1")
    await expect(page).toHaveURL(/collection=Arte\+digital/)

    await navigateSpa(page, "/?collection=Fotografia&sort=price_desc&page=1")
    await expect(page).toHaveURL(/collection=Fotografia/)

    await page.goBack()
    await expect(page).toHaveURL(/collection=Arte\+digital/)

    await navigateSpa(page, "/nfts/nft-inexistente-999")
    await expect(
      page.getByText(/não encontrado|inexistente/i).first()
    ).toBeVisible()
  })

  test("deve tratar expiração de sessão e isolar dados na troca de usuário", async ({
    page,
  }) => {
    await loginAsDemoCollector(page, {
      email: "lucas@kurio.art",
      password: "Kurio@2026",
    })

    await page.evaluate(async () => {
      await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "session-expired" }),
      })
    })

    await navigateSpa(page, "/profile")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/)

    // Faz login diretamente no formulário já aberto com redirect=%2Fprofile
    await page.getByLabel("E-mail", { exact: true }).fill("marina@kurio.art")
    await page.getByLabel("Senha", { exact: true }).fill("Kurio@2026")
    await page.locator('main form button[type="submit"]').click()

    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByLabel("Nome de exibição*")).toHaveValue(
      /Marina Costa/i
    )
    await expect(page.getByLabel("E-mail*")).toHaveValue("marina@kurio.art")
  })

  test("deve executar rollback otimista quando favoritar falhar", async ({
    page,
  }) => {
    await loginAsDemoCollector(page)
    await navigateSpa(page, "/nfts/nft-009")

    const favButton = page.getByRole("button", { name: /Favorit/i }).first()
    await expect(favButton).toBeVisible()
    const initialPressed = await favButton.getAttribute("aria-pressed")

    await page.evaluate(async () => {
      await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "network-error" }),
      })
    })

    await favButton.click()

    await expect(favButton).toHaveAttribute(
      "aria-pressed",
      initialPressed ?? "false"
    )
  })

  test("deve recuperar mesmo pedido após timeout usando idempotência e tolerar eventos antigos", async ({
    page,
  }) => {
    await loginAsDemoCollector(page)
    await navigateSpa(page, "/nfts/nft-042")
    await page.getByRole("button", { name: "COMPRAR" }).click()
    await expect(page).toHaveURL(/\/cart/)

    await page
      .getByRole("button", { name: /pagamento|checkout|finalizar/i })
      .click()
    await expect(page).toHaveURL(/\/checkout/)

    await page.evaluate(async () => {
      await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "order-timeout-recovery" }),
      })
    })

    await page.getByRole("button", { name: /Confirmar compra/i }).click()

    const recoverBtn = page.getByRole("button", {
      name: /Recuperar \/ Reenviar pedido/i,
    })
    await expect(recoverBtn).toBeEnabled({ timeout: 10000 })
    await recoverBtn.click()

    await expect(page).toHaveURL(/\/orders\/ORD-/, { timeout: 10000 })

    await expect(
      page.getByRole("button", { name: "Ver no Etherscan" })
    ).toBeVisible({ timeout: 8000 })

    // Evento antigo (version: 1) não deve regredir estado mais recente
    await page.evaluate(() => {
      const staleEvent = {
        eventId: "stale-event-001",
        nftId: "nft-042",
        version: 1,
        timestamp: new Date().toISOString(),
        changes: { priceEth: "99.99" },
      }
      const win = window as Window & {
        __KURIO_MOCK__?: {
          emitRawNftEvent?: (event: typeof staleEvent) => void
        }
      }
      win.__KURIO_MOCK__?.emitRawNftEvent?.(staleEvent)
    })

    await navigateSpa(page, "/nfts/nft-042")
    await expect(page.locator("main")).not.toContainText("99.99 ETH")
  })

  test("deve exibir skeletons durante carregamento lento e recuperar de falha de rede", async ({
    page,
  }, testInfo) => {
    await resetMockEnvironment(page, "slow", 1500)
    const scenarioPage =
      testInfo.project.name === "chromium-desktop"
        ? await page.context().newPage()
        : page
    if (scenarioPage === page) {
      await navigateSpa(scenarioPage, "/nfts/nft-042")
    } else {
      await gotoApp(scenarioPage, "/")
    }
    await expect(
      scenarioPage.locator(".skeleton-shimmer").first()
    ).toBeVisible()

    await resetMockEnvironment(scenarioPage, "network-error", 50)
    await navigateSpa(scenarioPage, "/?q=Ape")
    await expect(scenarioPage.getByRole("alert").first()).toBeVisible()

    await resetMockEnvironment(scenarioPage, "default", 50)
    const retryBtn = scenarioPage.getByRole("button", {
      name: /Tentar novamente/i,
    })
    await expect(retryBtn).toBeVisible()
    await retryBtn.click()
    await expect(
      scenarioPage.locator("#catalogo article").first()
    ).toBeVisible()
  })

  test("regressão visual das telas principais (Início, Detalhe, Carrinho e Pagamento)", async ({
    page,
  }) => {
    await navigateSpa(page, "/")
    await expect(page.locator("#catalogo article").first()).toBeVisible()
    await expect(page).toHaveScreenshot("01-home.png", { fullPage: false })

    await navigateSpa(page, "/nfts/nft-042")
    await expect(
      page.getByRole("heading", { name: /Emerald Ape #042/i })
    ).toBeVisible()
    await expect(page).toHaveScreenshot("02-nft-detail.png", { fullPage: false })

    await page.getByRole("button", { name: "COMPRAR" }).click()
    await expect(page).toHaveURL(/\/cart/)
    await expect(page).toHaveScreenshot("03-cart.png", { fullPage: false })

    await loginAsDemoCollector(page)
    await navigateSpa(page, "/checkout")
    await expect(
      page.getByRole("button", { name: "Confirmar compra" })
    ).toBeVisible()
    await expect(page).toHaveScreenshot("04-checkout.png", { fullPage: false })
  })
})