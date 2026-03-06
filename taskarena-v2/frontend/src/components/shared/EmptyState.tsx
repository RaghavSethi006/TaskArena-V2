interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-[10px] border border-b1 bg-s1 p-6 text-center">
      <h3 className="text-[15px] font-semibold text-tx">{title}</h3>
      <p className="mt-1 text-[12.5px] text-tx2">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors duration-[120ms]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
