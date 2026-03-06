import type { ReactNode } from "react"

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <div className="w-[220px] min-w-[220px] bg-s1 border-r border-b1 flex-shrink-0">
        <div className="p-4 text-tx3 text-xs font-mono">Sidebar - Phase 3B</div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-[50px] bg-s1 border-b border-b1 flex items-center px-4 text-tx3 text-xs font-mono flex-shrink-0">
          Topbar - Phase 3B
        </div>

        <main className="flex-1 overflow-y-auto bg-bg">{children}</main>
      </div>
    </div>
  )
}
