import { Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface StickyNote {
  id: string
  text: string
  color: string
}

const STORAGE_KEY = "taskarena-sticky-notes"
const COLORS = ["#fef08a", "#86efac", "#93c5fd", "#f9a8d4", "#fca5a5", "#d8b4fe"]

export default function StickyNotesTool() {
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as StickyNote[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const randomColor = useMemo(() => COLORS[Math.floor(Math.random() * COLORS.length)], [])

  const addNote = () => {
    setNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: "",
        color: randomColor,
      },
    ])
  }

  const updateText = (id: string, text: string) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text } : note)))
  }

  const updateColor = (id: string, color: string) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, color } : note)))
  }

  const removeNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={addNote}
          className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-[120ms] text-[11px] flex items-center gap-1"
          type="button"
        >
          <Plus className="w-3.5 h-3.5" /> Note
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
        {notes.length === 0 && <p className="col-span-2 text-[11px] text-tx3">No sticky notes yet.</p>}
        {notes.map((note) => (
          <div key={note.id} className="rounded-[10px] p-2 space-y-2" style={{ backgroundColor: note.color }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateColor(note.id, color)}
                    className={cn(
                      "w-3 h-3 rounded-full border border-black/20",
                      note.color === color && "ring-1 ring-black/40"
                    )}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
              <button onClick={() => removeNote(note.id)} className="text-black/60 hover:text-black transition-colors" type="button">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={note.text}
              onChange={(e) => updateText(note.id, e.target.value)}
              className="w-full min-h-[72px] bg-transparent text-[12px] text-black placeholder:text-black/40 outline-none resize-none"
              placeholder="Write a note..."
            />
          </div>
        ))}
      </div>
    </div>
  )
}

