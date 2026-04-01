import { cn } from "@/lib/utils"

interface AppLogoProps {
  className?: string
  imageClassName?: string
}

export default function AppLogo({ className, imageClassName }: AppLogoProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-white/10 bg-white/90 shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <img
        src="/taskarena-logo.png"
        alt="TaskArena logo"
        className={cn("h-full w-full object-contain", imageClassName)}
        draggable={false}
      />
    </div>
  )
}
