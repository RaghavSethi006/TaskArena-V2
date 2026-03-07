import { addDays, isToday, isWithinInterval, parseISO, startOfDay } from "date-fns"
import { Filter, LayoutGrid, List, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import TaskCard from "@/components/shared/TaskCard"
import { api } from "@/api/client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCreateTask, useTasks, useCompleteTask, useDeleteTask, useUncompleteTask } from "@/hooks/useTasks"
import type { Course, Task, TaskCreate } from "@/types"
import { useToolsStore } from "@/stores/toolsStore"
import { toast } from "sonner"

type ViewMode = "kanban" | "list"

interface TaskFilters {
  type: string
  status: string
  course_id: string
}

interface NewTaskForm {
  title: string
  type: "assignment" | "study" | "productivity"
  subject: string
  deadline: string
  points: number
  course_id: string
}

const KANBAN_TYPES: Array<{ key: Task["type"]; label: string; color: string }> = [
  { key: "assignment", label: "Assignment", color: "bg-orange-400" },
  { key: "study", label: "Study", color: "bg-blue-400" },
  { key: "productivity", label: "Productivity", color: "bg-emerald-400" },
]

function sortTasks(tasks: Task[], sortBy: "due" | "xp" | "created") {
  const copy = [...tasks]
  if (sortBy === "xp") return copy.sort((a, b) => b.points - a.points)
  if (sortBy === "created") return copy.sort((a, b) => b.id - a.id)
  return copy.sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
}

function groupKey(task: Task): "Overdue" | "Due Today" | "This Week" | "Later" | "Completed" {
  if (task.status === "completed") return "Completed"
  if (!task.deadline) return "Later"
  const now = startOfDay(new Date())
  const due = startOfDay(parseISO(task.deadline))
  if (due < now) return "Overdue"
  if (isToday(due)) return "Due Today"
  if (isWithinInterval(due, { start: now, end: addDays(now, 7) })) return "This Week"
  return "Later"
}

export default function TasksPage() {
  const [view, setView] = useState<ViewMode>("kanban")
  const [filters, setFilters] = useState<TaskFilters>({ type: "", status: "pending", course_id: "" })
  const [filterOpen, setFilterOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<"due" | "xp" | "created">("due")
  const [inlineByType, setInlineByType] = useState<Record<Task["type"], string>>({
    assignment: "",
    study: "",
    productivity: "",
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: "",
    type: "assignment",
    subject: "",
    deadline: "",
    points: 5,
    course_id: "",
  })

  const effectiveStatus = view === "kanban" ? "" : filters.status
  const tasksQuery = useTasks({ type: filters.type, status: effectiveStatus })
  const qc = useQueryClient()
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<Course[]>("/notes/courses"),
  })
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const uncompleteTask = useUncompleteTask()
  const deleteTask = useDeleteTask()

  const filteredTasks = useMemo(() => {
    const base = tasksQuery.data ?? []
    return base.filter((task) => {
      if (filters.course_id && String(task.course_id ?? "") !== filters.course_id) return false
      return true
    })
  }, [filters.course_id, tasksQuery.data])

  const groupedList = useMemo(() => {
    const sorted = sortTasks(filteredTasks, sortBy)
    const groups: Record<string, Task[]> = {
      Overdue: [],
      "Due Today": [],
      "This Week": [],
      Later: [],
      Completed: [],
    }
    sorted.forEach((task) => {
      groups[groupKey(task)].push(task)
    })
    return groups
  }, [filteredTasks, sortBy])

  const handleComplete = async (id: number, currentStatus: Task["status"]) => {
    try {
      if (currentStatus === "completed") {
        await uncompleteTask.mutateAsync(id)
        toast.success("Task marked as pending")
      } else {
        const result = await completeTask.mutateAsync(id)
        toast.success(`Task complete! +${result.xp_earned} XP`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update task"
      toast.error(message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this task? This cannot be undone.")) return
    try {
      await deleteTask.mutateAsync(id)
      toast.success("Task deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task"
      toast.error(message)
    }
  }

  const handleFocus = (task: Task) => {
    const store = useToolsStore.getState()
    store.pomodoroLink(task.id, task.title)
    store.pomodoroSetMode("focus")
    if (store.tools.pomodoro.state === "closed") store.openTool("pomodoro", "docked")
    if (!store.pomodoro.running) store.pomodoroToggle()
    toast(`Focusing on: ${task.title}`)
  }

  const createInlineTask = async (type: Task["type"]) => {
    const title = inlineByType[type].trim()
    if (!title) return
    const payload: TaskCreate = { title, type }
    await createTask.mutateAsync(payload)
    setInlineByType((prev) => ({ ...prev, [type]: "" }))
    toast.success("Task added")
  }

  const createFromModal = async () => {
    if (!newTask.title.trim()) {
      toast.error("Title is required")
      return
    }
    const payload: TaskCreate = {
      title: newTask.title.trim(),
      type: newTask.type,
      subject: newTask.subject || undefined,
      deadline: newTask.deadline || undefined,
      points: newTask.points,
      course_id: newTask.course_id ? Number(newTask.course_id) : undefined,
    }
    const task = await createTask.mutateAsync(payload)
    toast.success("Task created")

    if (newTask.deadline) {
      try {
        const eventType =
          newTask.type === "assignment"
            ? "assignment"
            : newTask.type === "study"
              ? "study"
              : "other"

        await api.post("/schedule", {
          title: newTask.title.trim(),
          type: eventType,
          date: newTask.deadline,
          course_id: task.course_id ?? null,
          notes: `Auto-synced from task #${task.id}`,
        })
        qc.invalidateQueries({ queryKey: ["schedule"] })
      } catch {
        // Schedule sync is best-effort and should not block task creation.
      }
    }

    setAddModalOpen(false)
    setNewTask({ title: "", type: "assignment", subject: "", deadline: "", points: 5, course_id: "" })
  }

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Tasks"
        subtitle="Manage assignments, study sessions, and productivity work."
        actions={
          <>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 text-[12px] hover:bg-s3 transition-colors duration-[120ms] inline-flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "h-8 px-3 rounded-[7px] border text-[12px] inline-flex items-center gap-1.5 transition-colors duration-[120ms]",
                view === "kanban" ? "border-blue-500/30 bg-[var(--bd)] text-blue-300" : "border-b1 bg-s2 text-tx2 hover:bg-s3"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "h-8 px-3 rounded-[7px] border text-[12px] inline-flex items-center gap-1.5 transition-colors duration-[120ms]",
                view === "list" ? "border-blue-500/30 bg-[var(--bd)] text-blue-300" : "border-b1 bg-s2 text-tx2 hover:bg-s3"
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors duration-[120ms] inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </button>
          </>
        }
      />

      {filterOpen ? (
        <div className="mb-4 rounded-[10px] border border-b1 bg-s1 p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
            className="h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
          >
            <option value="">All types</option>
            <option value="assignment">Assignment</option>
            <option value="study">Study</option>
            <option value="productivity">Productivity</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
          >
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={filters.course_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, course_id: e.target.value }))}
            className="h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
          >
            <option value="">All courses</option>
            {(coursesQuery.data ?? []).map((course) => (
              <option key={course.id} value={String(course.id)}>
                {course.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFilters({ type: "", status: "pending", course_id: "" })}
            className="h-8 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
          >
            Clear
          </button>
        </div>
      ) : null}

      {tasksQuery.isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Create your first task to get started." />
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {KANBAN_TYPES.map((column) => {
            const columnTasks = filteredTasks.filter((task) => task.type === column.key)
            const columnPending = columnTasks.filter((task) => task.status === "pending")
            const columnCompleted = columnTasks.filter((task) => task.status === "completed")
            const pendingCount = columnPending.length
            return (
              <div key={column.key} className="rounded-[10px] border border-b1 bg-s1 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", column.color)} />
                    <h3 className="text-[13px] font-semibold">{column.label}</h3>
                    <span className="text-[10px] text-tx3 font-mono">({pendingCount} pending)</span>
                  </div>
                </div>
                <div className="space-y-2 min-h-[220px]">
                  {columnPending.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={(id) => void handleComplete(id, task.status)}
                      onDelete={handleDelete}
                      onFocus={handleFocus}
                    />
                  ))}
                  {columnCompleted.length > 0 ? (
                    <div className="mt-2 border-t border-b1 pt-2">
                      <p className="mb-1.5 text-[10px] text-tx3 font-mono">
                        {columnCompleted.length} completed
                      </p>
                      {columnCompleted.map((task) => (
                        <div key={task.id} className="opacity-40">
                          <TaskCard
                            task={task}
                            onComplete={(id) => void handleComplete(id, task.status)}
                            onDelete={handleDelete}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 border border-dashed border-b1 rounded-[7px] p-2 flex items-center gap-2">
                  <input
                    value={inlineByType[column.key]}
                    onChange={(e) => setInlineByType((prev) => ({ ...prev, [column.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void createInlineTask(column.key)
                    }}
                    placeholder="+ Add task"
                    className="flex-1 bg-transparent text-[12px] text-tx placeholder:text-tx3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void createInlineTask(column.key)}
                    className="h-7 px-2 rounded-[6px] bg-blue-500 text-white text-[11px] hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[10px] border border-b1 bg-s1 p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12px] text-tx2">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "due" | "xp" | "created")}
              className="h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
            >
              <option value="due">Due date</option>
              <option value="xp">XP</option>
              <option value="created">Created</option>
            </select>
          </div>
          <div className="space-y-3">
            {Object.entries(groupedList).map(([group, tasks]) => (
              <div key={group}>
                <button
                  type="button"
                  onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))}
                  className="w-full text-left text-[12px] font-semibold text-tx2 mb-1"
                >
                  {group} ({tasks.length})
                </button>
                {!collapsedGroups[group] ? (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onComplete={(id) => void handleComplete(id, task.status)}
                        onDelete={handleDelete}
                        compact
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-tx3">Title *</label>
              <input
                value={newTask.title}
                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-tx3">Type *</label>
                <select
                  value={newTask.type}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, type: e.target.value as NewTaskForm["type"] }))
                  }
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
                >
                  <option value="assignment">Assignment</option>
                  <option value="study">Study</option>
                  <option value="productivity">Productivity</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-tx3">Points</label>
                <input
                  value={String(newTask.points)}
                  type="number"
                  onChange={(e) => setNewTask((prev) => ({ ...prev, points: Number(e.target.value || 5) }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-tx3">Subject</label>
                <input
                  value={newTask.subject}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, subject: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-tx3">Deadline</label>
                <input
                  value={newTask.deadline}
                  type="date"
                  onChange={(e) => setNewTask((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-tx3">Link to course</label>
              <select
                value={newTask.course_id}
                onChange={(e) => setNewTask((prev) => ({ ...prev, course_id: e.target.value }))}
                className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="">None</option>
                {(coursesQuery.data ?? []).map((course) => (
                  <option key={course.id} value={String(course.id)}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createFromModal()}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600"
            >
              Add Task
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
