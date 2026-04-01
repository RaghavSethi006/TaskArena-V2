import { cn } from "@/lib/utils"

interface AppLogoProps {
  className?: string
  imageClassName?: string
}

export default function AppLogo({ className, imageClassName }: AppLogoProps) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <img
        src="/taskarena-logo-ui.png"
        alt="TaskArena logo"
        className={cn("h-full w-full object-contain", imageClassName)}
        draggable={false}
      />
    </div>
  )
}
