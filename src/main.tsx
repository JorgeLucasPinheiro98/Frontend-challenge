import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

async function enableMocking() {
  const isMockEnabled = import.meta.env.VITE_ENABLE_MOCKS !== "false"
  if (!isMockEnabled) return

  const { worker } = await import("./infrastructure/mocks/browser")
  await worker.start({
    onUnhandledRequest: "bypass",
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})