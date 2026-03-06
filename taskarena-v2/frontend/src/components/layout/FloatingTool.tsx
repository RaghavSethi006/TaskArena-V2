import { PanelRight, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import type { ToolId } from "@/stores/toolsStore"
import { useToolsStore } from "@/stores/toolsStore"

interface FloatingToolProps {
  id: ToolId
  label: string
  icon: LucideIcon
  children: ReactNode
  minWidth?: number
}

export default function FloatingTool({
  id,
  label,
  icon: Icon,
  children,
  minWidth = 240,
}: FloatingToolProps) {
  const { tools, dock, closeTool, setPosition } = useToolsStore()
  const pos = tools[id].position
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true)
    setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y })
    e.preventDefault()
  }

  useEffect(() => {
    if (!dragging) return

    const onMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(window.innerWidth - minWidth, e.clientX - offset.x))
      const y = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.y))
      setPosition(id, x, y)
    }

    const onUp = () => setDragging(false)

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)

    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [dragging, id, minWidth, offset.x, offset.y, setPosition])

  return (
    <div
      style={{ left: pos.x, top: pos.y, minWidth, zIndex: 9999, position: "fixed" }}
      className="bg-s1 border border-b2 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,.6)] overflow-hidden"
    >
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-3 py-2 bg-s2/60 border-b border-b1 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-tx3" />
          <span className="text-[11px] font-semibold text-tx2">{label}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => dock(id)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors"
            title="Dock"
            type="button"
          >
            <PanelRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeTool(id)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-rose-400 transition-colors"
            title="Close"
            type="button"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

