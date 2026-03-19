import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UIStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  preferences: {
    soundEffects: boolean
    notifications: boolean
    autoIndexFiles: boolean
  }
  setPreference: (key: keyof UIStore["preferences"], value: boolean) => void

  // Onboarding
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (v: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      preferences: {
        soundEffects: true,
        notifications: true,
        autoIndexFiles: true,
      },
      setPreference: (key, value) =>
        set((s) => ({ preferences: { ...s.preferences, [key]: value } })),

      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
    }),
    { name: "taskarena-ui" }
  )
)
