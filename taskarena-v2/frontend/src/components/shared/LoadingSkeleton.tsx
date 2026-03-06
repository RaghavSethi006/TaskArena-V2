import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSkeletonProps {
  rows?: number
  card?: boolean
}

export default function LoadingSkeleton({ rows = 4, card = true }: LoadingSkeletonProps) {
  return (
    <div className={card ? "rounded-[10px] border border-b1 bg-s1 p-4 space-y-3" : "space-y-3"}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-8 w-full rounded-[7px] bg-s2" />
      ))}
    </div>
  )
}
