import { create } from "zustand"

interface UiStore {
  sidebarCollapsed: boolean
  searchOpen: boolean
  toggleSidebar: () => void
  setSearchOpen: (open: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  searchOpen: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSearchOpen: (open) => set({ searchOpen: open }),
}))
