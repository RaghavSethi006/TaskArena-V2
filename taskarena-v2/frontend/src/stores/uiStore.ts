import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AppSurfaceStyle, AppThemeId } from "@/lib/appearance"

interface UIStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  appearance: {
    theme: AppThemeId
    surfaceStyle: AppSurfaceStyle
    reducedMotion: boolean
  }
  setTheme: (theme: AppThemeId) => void
  setSurfaceStyle: (surfaceStyle: AppSurfaceStyle) => void
  setReducedMotion: (v: boolean) => void

  preferences: {
    soundEffects: boolean
    notifications: boolean
    autoIndexFiles: boolean
    showStartupTutorial: boolean
  }
  setPreference: (key: keyof UIStore["preferences"], value: boolean) => void

  // Onboarding
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (v: boolean) => void
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      appearance: {
        theme: "obsidian",
        surfaceStyle: "nebula",
        reducedMotion: false,
      },
      setTheme: (theme) =>
        set((s) => ({ appearance: { ...s.appearance, theme } })),
      setSurfaceStyle: (surfaceStyle) =>
        set((s) => ({ appearance: { ...s.appearance, surfaceStyle } })),
      setReducedMotion: (v) =>
        set((s) => ({ appearance: { ...s.appearance, reducedMotion: v } })),

      preferences: {
        soundEffects: true,
        notifications: true,
        autoIndexFiles: true,
        showStartupTutorial: true,
      },
      setPreference: (key, value) =>
        set((s) => ({ preferences: { ...s.preferences, [key]: value } })),

      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "taskarena-ui",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UIStore> | undefined
        return {
          ...currentState,
          ...persisted,
          appearance: {
            ...currentState.appearance,
            ...persisted?.appearance,
          },
          preferences: {
            ...currentState.preferences,
            ...persisted?.preferences,
          },
        }
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        appearance: state.appearance,
        preferences: state.preferences,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
