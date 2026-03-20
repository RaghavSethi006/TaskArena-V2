import { create } from "zustand"

interface PendingAdjustment {
  taskId: number
  taskTitle: string
  deadline: string
  triggeredAt: number
}

interface ScheduleStore {
  pendingAdjustment: PendingAdjustment | null
  setPendingAdjustment: (adj: PendingAdjustment | null) => void
  dismissAdjustment: () => void
}

export const useScheduleStore = create<ScheduleStore>()((set) => ({
  pendingAdjustment: null,
  setPendingAdjustment: (adj) => set({ pendingAdjustment: adj }),
  dismissAdjustment: () => set({ pendingAdjustment: null }),
}))
