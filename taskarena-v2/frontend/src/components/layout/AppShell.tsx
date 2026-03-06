import type { ReactNode } from "react"
import FloatingTool from "@/components/layout/FloatingTool"
import RightPanel from "@/components/layout/RightPanel"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import { TOOL_DEFINITIONS } from "@/components/layout/toolRegistry"
import { useToolsStore } from "@/stores/toolsStore"

interface AppShellProps {
  children: ReactNode
}

function FloatingToolsLayer() {
  const { tools } = useToolsStore()

  return (
    <>
      {TOOL_DEFINITIONS.map(({ id, label, icon, component: ToolComponent, minWidth }) =>
        tools[id].state === "floating" ? (
          <FloatingTool key={id} id={id} label={label} icon={icon} minWidth={minWidth}>
            <ToolComponent />
          </FloatingTool>
        ) : null
      )}
    </>
  )
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-bg p-6">{children}</main>
      </div>
      <RightPanel />
      <FloatingToolsLayer />
    </div>
  )
}

