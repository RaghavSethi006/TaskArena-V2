import { invoke } from "@tauri-apps/api/core"

const FALLBACK_PORT = 8765
const MAX_PORT_WAIT_ATTEMPTS = 50
const PORT_WAIT_MS = 100

type TaskArenaWindow = Window & {
  __BACKEND_PORT__?: number
  __TAURI__?: unknown
  __TAURI_INTERNALS__?: unknown
}

let backendPortPromise: Promise<number> | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readInjectedPort(): number | null {
  const port = (window as TaskArenaWindow).__BACKEND_PORT__
  return typeof port === "number" && port > 0 ? port : null
}

function isTauriRuntime(): boolean {
  const win = window as TaskArenaWindow
  return "__TAURI_INTERNALS__" in win || "__TAURI__" in win
}

async function getBackendPort(): Promise<number> {
  const injectedPort = readInjectedPort()
  if (injectedPort) {
    return injectedPort
  }

  if (!isTauriRuntime()) {
    return FALLBACK_PORT
  }

  if (!backendPortPromise) {
    backendPortPromise = (async () => {
      for (let attempt = 0; attempt < MAX_PORT_WAIT_ATTEMPTS; attempt += 1) {
        const currentPort = readInjectedPort()
        if (currentPort) {
          return currentPort
        }

        const port = await invoke<number>("get_backend_port").catch(() => 0)
        if (port > 0) {
          ;(window as TaskArenaWindow).__BACKEND_PORT__ = port
          return port
        }

        await sleep(PORT_WAIT_MS)
      }

      return 0
    })()
  }

  const port = await backendPortPromise
  if (port > 0) {
    return port
  }

  backendPortPromise = null
  return FALLBACK_PORT
}

export async function getBaseApiUrl(): Promise<string> {
  if (!isTauriRuntime() && import.meta.env.DEV) {
    return "/api"
  }

  const port = await getBackendPort()
  return `http://127.0.0.1:${port}/api`
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseApiUrl()
  const url = `${baseUrl}${path}`

  // Add a small retry for startup window (backend might still be initializing)
  const maxRetries = 3
  const retryDelay = 1000

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(error.detail ?? `HTTP ${res.status}`)
      }

      if (res.status === 204) {
        return undefined as T
      }

      return res.json()
    } catch (error) {
      // If it's the last attempt OR it's a "real" error (not a connection error), throw it
      if (i === maxRetries || (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("NetworkError"))) {
        throw error
      }
      // Otherwise, wait and try again
      console.warn(`[API] Retrying ${path} (attempt ${i + 1}/${maxRetries})...`)
      await sleep(retryDelay)
    }
  }
  throw new Error("Failed to fetch")
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
