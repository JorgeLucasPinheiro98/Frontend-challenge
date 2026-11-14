import { expect, test } from "@playwright/test"
import {
  gotoApp,
  loginAsDemoCollector,
  navigateSpa,
  resetMockEnvironment,
} from "./helpers"

test.describe("Socket.IO Isolado, Formulários de Conta e Acessibilidade por Teclado", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as Window & {
        __kurioSocketConnections?: number
        __kurioSocketDisconnections?: number
        __kurioNftEvents?: number
      }
      state.__kurioSocketConnections = 0
      state.__kurioSocketDisconnections = 0
      state.__kurioNftEvents = 0
      window.addEventListener("kurio:socket-connected", () => {
        state.__kurioSocketConnections = (state.__kurioSocketConnections ?? 0) + 1
      })
      window.addEventListener("kurio:socket-disconnected", () => {
        state.__kurioSocketDisconnections =
          (state.__kurioSocketDisconnections ?? 0) + 1
      })
      window.addEventListener("kurio:nft-updated", () => {
        state.__kurioNftEvents = (state.__kurioNftEvents ?? 0) + 1
      })
    })
    await gotoApp(page, "/")
    await resetMockEnvironment(page)
  })

  test("deve ignorar eventos Socket.IO duplicados (mesmo eventId)", async ({
    page,
  }) => {
    await navigateSpa(page, "/nfts/nft-042")
    await expect(
      page.getByRole("heading", { name: /Emerald Ape #042/i })
    ).toBeVisible()
    await expect(page.locator("main")).toContainText("1.19 ETH")
    await expect(page.locator("#main-content")).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __kurioSocketConnections?: number })
              .__kurioSocketConnections ?? 0
        )
      )
      .toBeGreaterThan(0)

    const responses = await page.evaluate(async () => {
      const eventId = `evt-dedup-${crypto.randomUUID()}`
      const payload = {
        eventId,
        nftId: "nft-042",
        priceEth: "1.55",
      }
      const results = []
      for (let i = 0; i < 2; i++) {
        const response = await fetch("/api/mock/emit-nft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        results.push(await response.json())
      }
      return results
    })
    expect(responses).toHaveLength(2)

    await expect(page.locator("main")).toContainText("1.55 ETH")
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __kurioNftEvents?: number }).__kurioNftEvents ??
            0
        )
      )
      .toBe(1)
    await expect(
      page.getByRole("status").filter({ hasText: /Atualização em tempo real/ })
    ).toHaveCount(1)
  })

  test("deve reconciliar os dados após reconectar o Socket.IO", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "A queda e reconexão de rede são validadas no navegador desktop."
    )
    await navigateSpa(page, "/nfts/nft-042")
    await expect(
      page.getByRole("heading", { name: /Emerald Ape #042/i })
    ).toBeVisible()
    await expect(page.locator("main")).toContainText("1.19 ETH")
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __kurioSocketConnections?: number })
              .__kurioSocketConnections ?? 0
        )
      )
      .toBeGreaterThan(0)
    await page.context().setOffline(true)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & {
              __kurioSocketDisconnections?: number
            }).__kurioSocketDisconnections ?? 0
        )
      )
      .toBeGreaterThan(0)
    await page.evaluate(() => {
      window.__KURIO_MOCK__?.updateNft("nft-042", { priceEth: "1.62" })
    })
    await page.context().setOffline(false)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { __kurioSocketConnections?: number })
              .__kurioSocketConnections ?? 0
        )
      )
      .toBeGreaterThan(1)

    await expect(page.locator("main")).toContainText("1.62 ETH")
  })

  test("deve cadastrar novo colecionador, validar erros e alterar senha no perfil", async ({
    page,
  }) => {
    await navigateSpa(page, "/register")

    // Validação de erro (senhas divergentes)
    await page.getByLabel(/Nome/i).first().fill("Camila Rocha")
    await page.locator("#reg-email").fill("camila@kurio.art")
    await page.getByLabel(/^Senha/i).fill("Kurio@2026")
    await page.getByLabel(/Confirmar senha/i).fill("Diferente@123")
    await page.locator('main form button[type="submit"]').click()
    await expect(page.getByRole("alert").first()).toBeVisible()

    // Cadastro válido
    await page.getByLabel(/Confirmar senha/i).fill("Kurio@2026")
    await page.locator('main form button[type="submit"]').click()
    await expect(page).not.toHaveURL(/\/register/)

    // Alteração de senha em /profile
    await navigateSpa(page, "/profile")
    await page.getByLabel("Senha atual").fill("Kurio@2026")
    await page.getByLabel("Nova senha", { exact: true }).fill("Kurio@2027")
    await page.getByLabel("Confirmar nova senha").fill("Kurio@2027")
    await page.getByRole("button", { name: "Salvar senha" }).click()
    await expect(page.getByText(/senha atualizada|sucesso/i).first()).toBeVisible()
  })

  test("deve retornar o mesmo pedido para a mesma chave e conflitar com outro conteudo", async ({
    page,
  }) => {
    await loginAsDemoCollector(page)
    await navigateSpa(page, "/nfts/nft-042")
    await page.getByRole("button", { name: "COMPRAR" }).click()
    await expect(page).toHaveURL(/\/cart/)

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem("kurio_auth_token")
      if (!token) throw new Error("Token de demonstracao ausente.")

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": "e2e-idempotency-payload-check",
      }
      const quoteResponse = await fetch("/api/cart?network=Ethereum", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const quote = await quoteResponse.json()
      const body = {
        walletId: "wal-01",
        network: "Ethereum",
        expectedTotalEth: quote.totalEth,
        cartItems: quote.items.map(
          (item: { nftId: string; quantity: number }) => ({
            nftId: item.nftId,
            quantity: item.quantity,
          })
        ),
      }
      const submit = (payload: typeof body) =>
        fetch("/api/orders", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        })

      const firstResponse = await submit(body)
      const firstOrder = await firstResponse.json()
      const retryResponse = await submit(body)
      const retryOrder = await retryResponse.json()
      const conflictResponse = await submit({
        ...body,
        cartItems: [{ nftId: "nft-009", quantity: 1 }],
      })
      const conflict = await conflictResponse.json()

      return {
        firstStatus: firstResponse.status,
        firstId: firstOrder.id,
        retryStatus: retryResponse.status,
        retryId: retryOrder.id,
        conflictStatus: conflictResponse.status,
        conflictCode: conflict.code,
      }
    })

    expect(result.firstStatus).toBe(201)
    expect(result.retryStatus).toBe(200)
    expect(result.retryId).toBe(result.firstId)
    expect(result.conflictStatus).toBe(409)
    expect(result.conflictCode).toBe("IDEMPOTENCY_CONFLICT")
  })

  test("deve permitir navegação por teclado, skip link e foco visível", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "A navegação por teclado é validada em um navegador desktop."
    )
    await gotoApp(page, "/")
    await expect(page.locator("#main-content")).toBeVisible()
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    })

    // Primeiro Tab deve focar o skip link "Pular para o conteúdo principal"
    await page.keyboard.press("Tab")
    const skipLink = page.getByRole("link", {
      name: /Pular para o conteúdo principal/i,
    })
    await expect(skipLink).toBeFocused()

    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/#main-content/)

    // Tab sequencial nos elementos interativos mantendo foco visível
    await page.keyboard.press("Tab")
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(focusedTag)
  })
})