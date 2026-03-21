import type { LucideIcon } from "lucide-react"
import { PackageOpen } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-[10px] border border-b1 bg-s1 p-8 text-center flex flex-col items-center">
      <div className="w-12 h-12 rounded-[12px] bg-s2 border border-b1 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-tx3" />
      </div>
      <h3 className="text-[14px] font-semibold text-tx">{title}</h3>
      <p className="mt-1 text-[12px] text-tx3 max-w-[260px] leading-relaxed">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 h-8 px-4 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
