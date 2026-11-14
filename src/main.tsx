import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

async function enableMocking() {
  const isMockEnabled = import.meta.env.VITE_ENABLE_MOCKS !== "false"
  if (!isMockEnabled) return

  const { worker } = await import("./infrastructure/mocks/browser")
  await worker.start({
    onUnhandledRequest: "bypass",
    waitUntilReady: true,
  })
}

async function bootstrap() {
  const [{ default: App }] = await Promise.all([
    import("./App"),
    enableMocking(),
  ])

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()