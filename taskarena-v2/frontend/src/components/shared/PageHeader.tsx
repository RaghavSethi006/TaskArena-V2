import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
      <div>
        <h1 className="text-[19px] font-bold tracking-tight">{title}</h1>
        <p className="text-[12.5px] text-tx2 mt-1">{subtitle}</p>
      </div>
      {actions ? <div className="flex gap-2 items-center">{actions}</div> : null}
    </div>
  )
}
