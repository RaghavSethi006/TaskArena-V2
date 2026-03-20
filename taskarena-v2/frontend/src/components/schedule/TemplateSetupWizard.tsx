import { ChevronRight, Moon, Plus, Sun, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useCreateSlot, useUpdateSchedulePreferences } from "@/hooks/useSchedule"
import { cn } from "@/lib/utils"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const CATEGORY_CONFIG = {
  class: { label: "Class", icon: "CLS", color: "#3b82f6" },
  lab: { label: "Lab", icon: "LAB", color: "#8b5cf6" },
  gym: { label: "Gym", icon: "GYM", color: "#10b981" },
  extracurricular: { label: "Extracurricular", icon: "EXT", color: "#f97316" },
  personal: { label: "Personal", icon: "PER", color: "#eab308" },
  sleep: { label: "Sleep", icon: "SLP", color: "#64748b" },
  other: { label: "Other", icon: "OTH", color: "#71717a" },
} as const

type Category = keyof typeof CATEGORY_CONFIG

interface SlotDraft {
  id: string
  title: string
  days: number[]
  start_time: string
  duration_minutes: number
  category: Category
  color: string
}

interface WizardProps {
  onComplete: () => void
}

export default function TemplateSetupWizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [slots, setSlots] = useState<SlotDraft[]>([])
  const [saving, setSaving] = useState(false)

  const [slotForm, setSlotForm] = useState<Omit<SlotDraft, "id">>({
    title: "",
    days: [],
    start_time: "09:00",
    duration_minutes: 90,
    category: "class",
    color: "#3b82f6",
  })

  const [prefs, setPrefs] = useState({
    wake_time: "07:00",
    sleep_time: "23:00",
    daily_study_hours: 4,
    study_block_minutes: 90,
    preferred_study_time: "any" as "morning" | "afternoon" | "evening" | "any",
    free_time_minutes: 120,
    study_days: ["mon", "tue", "wed", "thu", "fri"],
    notes: "",
  })

  const createSlot = useCreateSlot()
  const updatePrefs = useUpdateSchedulePreferences()

  const addSlotToList = () => {
    if (!slotForm.title.trim() || slotForm.days.length === 0) {
      toast.error("Title and at least one day are required")
      return
    }
    setSlots((prev) => [
      ...prev,
      {
        ...slotForm,
        id: `${Date.now()}`,
        title: slotForm.title.trim(),
      },
    ])
    setSlotForm((p) => ({ ...p, title: "", days: [] }))
  }

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id))
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await updatePrefs.mutateAsync({
        wake_time: `${prefs.wake_time}:00`,
        sleep_time: `${prefs.sleep_time}:00`,
        daily_study_hours: prefs.daily_study_hours,
        study_block_minutes: prefs.study_block_minutes,
        preferred_study_time: prefs.preferred_study_time,
        free_time_minutes: prefs.free_time_minutes,
        study_days: prefs.study_days.join(","),
        notes: prefs.notes || null,
      })

      for (const slot of slots) {
        for (const day of slot.days) {
          await createSlot.mutateAsync({
            title: slot.title,
            day_of_week: day,
            start_time: `${slot.start_time}:00`,
            duration_minutes: slot.duration_minutes,
            category: slot.category,
            color: slot.color,
            course_id: null,
          })
        }
      }

      toast.success("Weekly template saved")
      onComplete()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors",
                step >= s ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx3"
              )}
            >
              {s}
            </div>
            {s < 3 && (
              <div className={cn("flex-1 h-px w-12", step > s ? "bg-blue-500" : "bg-b1")} />
            )}
          </div>
        ))}
        <span className="ml-2 text-[12px] text-tx3">
          {step === 1 ? "Fixed Weekly Events" : step === 2 ? "Study Preferences" : "Review & Save"}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-tx">Your Fixed Weekly Events</h2>
            <p className="text-[12px] text-tx3 mt-0.5">
              Add your recurring classes, gym sessions, extracurriculars, etc. The AI will never
              schedule study time during these.
            </p>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-tx3">Event name *</label>
                <input
                  value={slotForm.title}
                  onChange={(e) => setSlotForm((p) => ({ ...p, title: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSlotToList()
                  }}
                  placeholder="e.g. COMP2400 Lecture"
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-tx3">Category</label>
                <select
                  value={slotForm.category}
                  onChange={(e) => {
                    const cat = e.target.value as Category
                    setSlotForm((p) => ({
                      ...p,
                      category: cat,
                      color: CATEGORY_CONFIG[cat].color,
                    }))
                  }}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-tx3">Day(s) *</label>
              <div className="flex gap-1.5 mt-1">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setSlotForm((p) => ({
                        ...p,
                        days: p.days.includes(idx)
                          ? p.days.filter((d) => d !== idx)
                          : [...p.days, idx],
                      }))
                    }
                    className={cn(
                      "flex-1 h-8 rounded-[6px] text-[11px] font-medium border transition-colors",
                      slotForm.days.includes(idx)
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-tx3">Start time</label>
                <input
                  value={slotForm.start_time}
                  type="time"
                  onChange={(e) => setSlotForm((p) => ({ ...p, start_time: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-tx3">Duration (minutes)</label>
                <input
                  value={String(slotForm.duration_minutes)}
                  type="number"
                  min={15}
                  max={480}
                  onChange={(e) =>
                    setSlotForm((p) => ({
                      ...p,
                      duration_minutes: Number(e.target.value || 60),
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addSlotToList}
              className="w-full h-8 rounded-[7px] bg-s2 border border-b1 text-[12px] text-tx2 hover:bg-s3 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to template
            </button>
          </div>

          {slots.length > 0 && (
            <div className="space-y-1.5">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center gap-3 rounded-[8px] border border-b1 bg-s1 px-3 py-2"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slot.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-tx truncate">{slot.title}</p>
                    <p className="text-[10px] text-tx3 font-mono">
                      {slot.days.map((d) => DAYS[d]).join(", ")} - {slot.start_time} -{" "}
                      {slot.duration_minutes}min
                    </p>
                  </div>
                  <span className="text-[10px] text-tx3">{CATEGORY_CONFIG[slot.category].icon}</span>
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    className="text-tx3 hover:text-rose-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {slots.length === 0 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx3 hover:bg-s3"
              >
                Skip - I'll add these later
              </button>
            )}
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={slots.length === 0}
              className="h-9 px-5 rounded-[8px] bg-blue-500 text-white text-[12px] font-medium hover:bg-blue-600 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-tx">Study Preferences</h2>
            <p className="text-[12px] text-tx3 mt-0.5">
              Tell the AI how you like to work so it can build a realistic schedule.
            </p>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-tx3 flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Wake time
                </label>
                <input
                  value={prefs.wake_time}
                  type="time"
                  onChange={(e) => setPrefs((p) => ({ ...p, wake_time: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-tx3 flex items-center gap-1">
                  <Moon className="w-3 h-3" /> Sleep time
                </label>
                <input
                  value={prefs.sleep_time}
                  type="time"
                  onChange={(e) => setPrefs((p) => ({ ...p, sleep_time: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-tx3">Study hours per day</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={prefs.daily_study_hours}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        daily_study_hours: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-[13px] font-bold font-mono text-tx w-8 text-right">
                    {prefs.daily_study_hours}h
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-tx3">Preferred block length</label>
                <select
                  value={prefs.study_block_minutes}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      study_block_minutes: Number(e.target.value),
                    }))
                  }
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
                >
                  <option value={45}>45 min - Short sprints</option>
                  <option value={60}>60 min - One hour</option>
                  <option value={90}>90 min - Deep work</option>
                  <option value={120}>2 hours - Extended</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-tx3">Preferred study time</label>
              <div className="flex gap-2 mt-1">
                {(["morning", "afternoon", "evening", "any"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, preferred_study_time: t }))}
                    className={cn(
                      "flex-1 h-8 rounded-[7px] border text-[11px] capitalize transition-colors",
                      prefs.preferred_study_time === t
                        ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                        : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-tx3">Free time to protect per day</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={30}
                  value={prefs.free_time_minutes}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      free_time_minutes: Number(e.target.value),
                    }))
                  }
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-[13px] font-bold font-mono text-tx w-14 text-right">
                  {prefs.free_time_minutes}min
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-tx3">Days I study</label>
              <div className="flex gap-1.5 mt-1">
                {DAYS.map((day) => {
                  const key = day.toLowerCase()
                  const active = prefs.study_days.includes(key)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setPrefs((p) => ({
                          ...p,
                          study_days: active
                            ? p.study_days.filter((d) => d !== key)
                            : [...p.study_days, key],
                        }))
                      }
                      className={cn(
                        "flex-1 h-8 rounded-[6px] text-[11px] border transition-colors",
                        active
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-s2 border-b1 text-tx2 hover:bg-s3"
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-tx3">Any notes for the AI? (optional)</label>
              <textarea
                value={prefs.notes}
                onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value }))}
                placeholder={`e.g. "I can't focus after 9pm" or "I need a lunch break at noon"`}
                className="mt-1 min-h-[60px] w-full rounded-[7px] border border-b1 bg-s2 px-3 py-2 text-[12px] text-tx outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-9 px-4 rounded-[8px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="h-9 px-5 rounded-[8px] bg-blue-500 text-white text-[12px] font-medium hover:bg-blue-600 inline-flex items-center gap-1.5"
            >
              Review & Save <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-tx">Review Your Template</h2>
            <p className="text-[12px] text-tx3 mt-0.5">
              Everything looks good? Save to activate your template.
            </p>
          </div>

          <div className="rounded-[10px] border border-b1 bg-s1 p-4 space-y-3">
            <div>
              <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-2">
                Fixed Events ({slots.length})
              </p>
              {slots.length === 0 ? (
                <p className="text-[11px] text-tx3">None added</p>
              ) : (
                <div className="space-y-1">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2 text-[11px]">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: slot.color }}
                      />
                      <span className="text-tx">{slot.title}</span>
                      <span className="text-tx3 font-mono">
                        {slot.days.map((d) => DAYS[d]).join("/")} - {slot.start_time} -{" "}
                        {slot.duration_minutes}min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-b1 pt-3">
              <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-2">
                Preferences
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {[
                  ["Wake/Sleep", `${prefs.wake_time} - ${prefs.sleep_time}`],
                  ["Study/day", `${prefs.daily_study_hours}h`],
                  ["Block length", `${prefs.study_block_minutes}min`],
                  ["Best time", prefs.preferred_study_time],
                  ["Free time/day", `${prefs.free_time_minutes}min`],
                  ["Study days", prefs.study_days.join(", ")],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-tx3">{label}</span>
                    <span className="text-tx font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-9 px-4 rounded-[8px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
            >
              Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleFinish()}
              className="h-9 px-5 rounded-[8px] bg-gradient-to-r from-blue-500 to-violet-600 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? "Saving..." : "Save Template & Start"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
