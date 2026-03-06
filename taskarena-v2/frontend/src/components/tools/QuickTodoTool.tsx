import { Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface TodoItem {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = "taskarena-quick-todo"

export default function QuickTodoTool() {
  const [items, setItems] = useState<TodoItem[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as TodoItem[]
    } catch {
      return []
    }
  })
  const [input, setInput] = useState("")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => Number(a.done) - Number(b.done))
  }, [items])

  const addItem = () => {
    const text = input.trim()
    if (!text) return
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setInput("")
  }

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem()
          }}
          className="flex-1 h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx placeholder:text-tx3 outline-none"
          placeholder="Add quick task"
        />
        <button
          onClick={addItem}
          className="h-8 px-2.5 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-[120ms]"
          type="button"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
        {sortedItems.length === 0 && <p className="text-[11px] text-tx3">No quick todos yet.</p>}
        {sortedItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-[7px] border border-b1 bg-s2/40 p-2">
            <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} className="accent-blue-500" />
            <span
              className={cn(
                "text-[12px] flex-1",
                item.done ? "text-tx3 line-through" : "text-tx"
              )}
            >
              {item.text}
            </span>
            <button onClick={() => deleteItem(item.id)} className="text-tx3 hover:text-rose-400 transition-colors" type="button">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

