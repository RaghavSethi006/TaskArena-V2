import { ExternalLink, X } from "lucide-react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { TOOL_DEFINITIONS } from "@/components/layout/toolRegistry"
import { cn } from "@/lib/utils"
import type { ToolId } from "@/stores/toolsStore"
import { useToolsStore } from "@/stores/toolsStore"

interface DockedToolSectionProps {
  id: ToolId
  label: string
  icon: LucideIcon
  children: ReactNode
}

function DockedToolSection({ id, label, icon: Icon, children }: DockedToolSectionProps) {
  const { popOut, closeTool } = useToolsStore()

  return (
    <div className="border-b border-b1">
      <div className="flex items-center justify-between px-3 py-2 bg-s2/50">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-tx3" />
          <span className="text-[11px] font-semibold text-tx2">{label}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => popOut(id)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors"
            title="Pop out"
            type="button"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeTool(id)}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-s3 text-tx3 hover:text-tx transition-colors"
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

export default function RightPanel() {
  const { tools } = useToolsStore()
  const anyDocked = Object.values(tools).some((tool) => tool.state === "docked")

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-s1 border-l border-b1 overflow-y-auto transition-all duration-200",
        anyDocked ? "w-[280px]" : "w-0 border-0 overflow-hidden"
      )}
    >
      {anyDocked && (
        <div className="flex flex-col">
          {TOOL_DEFINITIONS.map(({ id, label, icon, component: ToolComponent }) =>
            tools[id].state === "docked" ? (
              <DockedToolSection key={id} id={id} label={label} icon={icon}>
                <ToolComponent />
              </DockedToolSection>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

