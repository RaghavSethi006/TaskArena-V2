import { ExternalLink, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { open } from "@tauri-apps/plugin-shell"

interface QuickLink {
  id: string
  name: string
  url: string
}

const STORAGE_KEY = "taskarena-quick-links"

function normalizeUrl(raw: string): string {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
  return `https://${raw}`
}

export default function QuickLinksTool() {
  const [links, setLinks] = useState<QuickLink[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as QuickLink[]
    } catch {
      return []
    }
  })
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
  }, [links])

  const addLink = () => {
    const nextName = name.trim()
    const nextUrl = url.trim()
    if (!nextName || !nextUrl) return

    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: nextName, url: normalizeUrl(nextUrl) },
    ])
    setName("")
    setUrl("")
  }

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id))
  }

  const openLink = async (target: string) => {
    try {
      await open(target)
    } catch {
      console.log("Open link (browser dev fallback):", target)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx placeholder:text-tx3 outline-none"
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx placeholder:text-tx3 outline-none"
          />
          <button
            onClick={addLink}
            className="h-8 px-2.5 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-[120ms]"
            type="button"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
        {links.length === 0 && <p className="text-[11px] text-tx3">No links saved.</p>}
        {links.map((link) => (
          <div key={link.id} className="rounded-[7px] border border-b1 bg-s2/40 p-2 flex items-center gap-2">
            <button
              onClick={() => void openLink(link.url)}
              className="flex-1 text-left min-w-0"
              type="button"
            >
              <div className="text-[12px] text-tx truncate">{link.name}</div>
              <div className="text-[10px] text-tx3 font-mono truncate">{link.url}</div>
            </button>
            <button
              onClick={() => void openLink(link.url)}
              className="text-tx3 hover:text-blue-300 transition-colors"
              type="button"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => removeLink(link.id)}
              className="text-tx3 hover:text-rose-400 transition-colors"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

