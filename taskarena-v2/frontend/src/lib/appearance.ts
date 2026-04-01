export const APP_COLOR_MODE_OPTIONS = [
  {
    id: "dark",
    label: "Dark",
    description: "Cinematic low-light workspace.",
  },
  {
    id: "light",
    label: "Light",
    description: "Bright canvas with softer panels.",
  },
] as const

export type AppColorMode = (typeof APP_COLOR_MODE_OPTIONS)[number]["id"]

export const APP_THEME_OPTIONS = [
  {
    id: "obsidian",
    label: "Obsidian",
    description: "The original dark studio look.",
    preview: ["#09090b", "#18181b", "#3b82f6"],
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Cool slate surfaces with softer contrast.",
    preview: ["#0f172a", "#1e293b", "#60a5fa"],
  },
  {
    id: "evergreen",
    label: "Evergreen",
    description: "Deep forest tones for long focus sessions.",
    preview: ["#08110d", "#13211a", "#34d399"],
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm night palette with subtle copper glow.",
    preview: ["#140d0a", "#231613", "#fb923c"],
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Blue-violet panels with a neon edge.",
    preview: ["#090b16", "#14182a", "#8b5cf6"],
  },
] as const

export type AppThemeId = (typeof APP_THEME_OPTIONS)[number]["id"]

export const APP_SURFACE_OPTIONS = [
  {
    id: "nebula",
    label: "Nebula",
    description: "Soft color bloom in the background.",
  },
  {
    id: "grid",
    label: "Grid",
    description: "Subtle blueprint lines behind the app.",
  },
  {
    id: "flat",
    label: "Flat",
    description: "Minimal surfaces with no extra texture.",
  },
] as const

export type AppSurfaceStyle = (typeof APP_SURFACE_OPTIONS)[number]["id"]

export const APP_SIDEBAR_OPTIONS = [
  {
    id: "solid",
    label: "Solid",
    description: "Classic anchored navigation panel.",
  },
  {
    id: "frosted",
    label: "Frosted Glass",
    description: "Blurred translucent sidebar with depth.",
  },
] as const

export type AppSidebarStyle = (typeof APP_SIDEBAR_OPTIONS)[number]["id"]
