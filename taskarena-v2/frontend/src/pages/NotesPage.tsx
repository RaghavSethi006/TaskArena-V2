import { open } from "@tauri-apps/plugin-dialog"
import { open as shellOpen } from "@tauri-apps/plugin-shell"
import { BookOpen, Eye, EyeOff, FileText, Folder as FolderIcon, Plus, Search, Trash2, Upload, X } from "lucide-react"
import { useMemo, useState } from "react"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  useCourseSearch,
  useCourses,
  useCreateCourse,
  useCreateFile,
  useCreateFolder,
  useDeleteCourse,
  useDeleteFile,
  useFiles,
  useFolders,
  useIndexFile,
} from "@/hooks/useNotes"
import type { Course, Folder } from "@/types"
import { toast } from "sonner"

const COURSE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#eab308", "#ef4444", "#06b6d4",
]

function formatSize(size: number | null): string {
  if (!size) return "-"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function NotesPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [newCourseOpen, setNewCourseOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: "", code: "", color: "#3b82f6" })
  const [newFolderName, setNewFolderName] = useState("")
  const [search, setSearch] = useState("")
  const [indexingId, setIndexingId] = useState<number | null>(null)
  const [autoIndex, setAutoIndex] = useState(true)
  const [previewFile, setPreviewFile] = useState<import("@/types").File | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set())

  const coursesQuery = useCourses()
  const foldersQuery = useFolders(selectedCourse?.id ?? null)
  const filesQuery = useFiles(selectedFolder?.id ?? null)
  const searchQuery = useCourseSearch(selectedCourse?.id ?? null, search, selectedFolder?.id)
  const createCourse = useCreateCourse()
  const createFolder = useCreateFolder()
  const createFile = useCreateFile()
  const deleteCourse = useDeleteCourse()
  const deleteFile = useDeleteFile()
  const indexFile = useIndexFile()

  const courseStats = useMemo(() => {
    const folders = foldersQuery.data ?? []
    const fileCount = filesQuery.data?.length ?? 0
    return { folderCount: folders.length, fileCount }
  }, [filesQuery.data?.length, foldersQuery.data])

  const pickFiles = async () => {
    if (!selectedFolder) return

    let pickedPaths: string[] = []
    try {
      const result = await open({
        multiple: true,
        filters: [{ name: "Documents", extensions: ["pdf", "docx", "txt", "md"] }],
      })
      if (!result) return
      pickedPaths = Array.isArray(result) ? result : [result]
    } catch {
      const manual = window.prompt("Paste file path (one path only)")
      if (manual?.trim()) pickedPaths = [manual.trim()]
    }

    if (pickedPaths.length === 0) return

    let added = 0
    for (const pickedPath of pickedPaths) {
      const name = pickedPath.split(/[\\/]/).pop() ?? "file"
      try {
        const file = await createFile.mutateAsync({
          folderId: selectedFolder.id,
          name,
          path: pickedPath,
        })

        added++

        if (autoIndex) {
          indexFile.mutateAsync({ fileId: file.id }).catch(() => {
            // silently ignore index failures; user can retry manually
          })
        }
      } catch {
        toast.error(`Failed to add: ${name}`)
      }
    }

    if (added > 0) {
      toast.success(
        autoIndex
          ? `${added} file${added > 1 ? "s" : ""} added and indexing in background`
          : `${added} file${added > 1 ? "s" : ""} added`
      )
    }
  }

  const createCourseHandler = async () => {
    if (!newCourse.name.trim()) {
      toast.error("Course name is required")
      return
    }

    await createCourse.mutateAsync({
      name: newCourse.name.trim(),
      code: newCourse.code.trim() || undefined,
      color: newCourse.color,
    })
    toast.success("Course created")
    setNewCourseOpen(false)
    setNewCourse({ name: "", code: "", color: "#3b82f6" })
  }

  const deleteCourseHandler = async (courseId: number, courseName: string) => {
    if (!window.confirm(`Delete "${courseName}" and ALL its folders, files, and quizzes? This cannot be undone.`)) {
      return
    }

    await deleteCourse.mutateAsync(courseId)
    toast.success("Course deleted")
  }

  const createFolderHandler = async () => {
    if (!selectedCourse || !newFolderName.trim()) return
    await createFolder.mutateAsync({ courseId: selectedCourse.id, name: newFolderName.trim() })
    setNewFolderName("")
    toast.success("Folder created")
  }

  const indexFileHandler = async (fileId: number) => {
    setIndexingId(fileId)
    try {
      const result = await indexFile.mutateAsync({ fileId })
      toast.success(`Indexed ${result.chunks_created} chunks`)
    } finally {
      setIndexingId(null)
    }
  }
  const openInOS = async (path: string) => {
    try {
      await shellOpen(path)
    } catch {
      toast.error("Could not open file — check that the path still exists.")
    }
  }

  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const bulkDelete = async () => {
    if (!selectedFolder) return
    const count = selectedFileIds.size
    if (!window.confirm(`Delete ${count} file${count > 1 ? "s" : ""}? This cannot be undone.`)) return
    for (const fileId of selectedFileIds) {
      await deleteFile.mutateAsync({ fileId, folderId: selectedFolder.id })
    }
    setSelectedFileIds(new Set())
    toast.success(`${count} file${count > 1 ? "s" : ""} deleted`)
  }

  if (coursesQuery.isLoading) {
    return <LoadingSkeleton rows={8} />
  }

  return (
    <>
      {!selectedCourse ? (
        <div className="animate-fadeUp">
          <PageHeader
            title="Study Library"
            subtitle="Browse courses and files."
            actions={
              <button
                type="button"
                onClick={() => setNewCourseOpen(true)}
                className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Course
              </button>
            }
          />
          {(coursesQuery.data ?? []).length === 0 ? (
            <EmptyState title="No courses found" description="Create a course to start building your library." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(coursesQuery.data ?? []).map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className="group rounded-[12px] border border-b1 bg-s1 overflow-hidden text-left hover:border-b2 hover:shadow-lg transition-all duration-[120ms]"
                >
                  <div
                    className="h-28 flex items-center justify-center"
                    style={{ backgroundColor: `${course.color}14` }}
                  >
                    <div className="relative">
                      <div
                        className="absolute -top-3 left-0 w-12 h-3 rounded-t-[5px]"
                        style={{ backgroundColor: course.color }}
                      />
                      <div
                        className="w-24 h-16 rounded-[5px] rounded-tl-none flex items-center justify-center"
                        style={{ backgroundColor: course.color }}
                      >
                        <BookOpen className="w-7 h-7 text-white/80" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-tx">{course.name}</p>
                        <p className="text-[11px] text-tx3 font-mono mt-0.5">{course.code}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void deleteCourseHandler(course.id, course.name)
                        }}
                        className="w-6 h-6 rounded-[5px] text-tx3 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors flex-shrink-0"
                        title="Delete course"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-tx3 font-mono">
                      <span className="flex items-center gap-1">
                        <FolderIcon className="w-3 h-3" />
                        {course.folder_count ?? 0} {course.folder_count === 1 ? "folder" : "folders"}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {course.file_count ?? 0} {course.file_count === 1 ? "file" : "files"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fadeUp">
          <PageHeader
            title="Study Library"
            subtitle={`Library > ${selectedCourse.name}${selectedFolder ? ` > ${selectedFolder.name}` : ""}`}
            actions={
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(null)
                  setSelectedFolder(null)
                  setSelectedFileIds(new Set())
                  setPreviewFile(null)
                  setSearch("")
                }}
                className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
              >
                Back
              </button>
            }
          />

          <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-3">
            <aside className="rounded-[10px] border border-b1 bg-s1 p-3">
              <h3 className="text-[12px] text-tx2 font-semibold mb-2">Folders ({courseStats.folderCount})</h3>
              <div className="space-y-1 max-h-[360px] overflow-y-auto">
                {(foldersQuery.data ?? []).map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setSelectedFolder(folder)
                      setSelectedFileIds(new Set())
                      setPreviewFile(null)
                    }}
                    className={`w-full text-left rounded-[7px] px-2 py-2 text-[12px] border transition-colors duration-[120ms] ${
                      selectedFolder?.id === folder.id ? "border-blue-500/30 bg-[var(--bd)] text-blue-200" : "border-transparent hover:bg-s2 text-tx2"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <FolderIcon className="w-3.5 h-3.5" />
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder"
                  className="flex-1 h-8 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx outline-none"
                />
                <button
                  type="button"
                  onClick={() => void createFolderHandler()}
                  className="h-8 px-2 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
            </aside>

            <section className="rounded-[10px] border border-b1 bg-s1 p-3">
              {!selectedFolder ? (
                <EmptyState title="Select a folder" description="Pick a folder to view files." />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 flex-1 rounded-[7px] border border-b1 bg-s2 px-2 inline-flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-tx3" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search indexed content"
                        className="bg-transparent flex-1 text-[12px] text-tx outline-none"
                      />
                    </div>
                    {/* Auto-index toggle */}
                    <button
                      type="button"
                      onClick={() => setAutoIndex((v) => !v)}
                      title={autoIndex ? "Auto-index ON — click to disable" : "Auto-index OFF — click to enable"}
                      className={`h-8 px-2.5 rounded-[7px] border text-[11px] font-mono inline-flex items-center gap-1.5 transition-colors ${
                        autoIndex
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                          : "bg-s2 border-b1 text-tx3 hover:bg-s3"
                      }`}
                    >
                      {"\u26A1"} Auto-index {autoIndex ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void pickFiles()}
                      className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Add Files
                    </button>
                  </div>

                  {search.trim().length > 1 ? (
                    <div className="space-y-2 mb-3">
                      {(searchQuery.data ?? []).map((item) => (
                        <div key={`${item.file_id}-${item.score}`} className="rounded-[7px] border border-b1 bg-s2/40 p-2">
                          <p className="text-[11px] text-blue-300 font-mono">Score {item.score.toFixed(3)} - {item.file_name}</p>
                          <p className="text-[12px] text-tx2 mt-1">{item.preview}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Bulk action bar */}
                  {selectedFileIds.size > 0 && (
                    <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-rose-500/25 bg-[var(--rd)] px-3 py-2">
                      <span className="text-[12px] text-rose-300 flex-1">
                        {selectedFileIds.size} file{selectedFileIds.size > 1 ? "s" : ""} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFileIds(new Set())}
                        className="h-7 px-2 rounded-[6px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void bulkDelete()}
                        className="h-7 px-2 rounded-[6px] bg-rose-500 text-white text-[11px] hover:bg-rose-600"
                      >
                        Delete Selected
                      </button>
                    </div>
                  )}

                  <div
                    className={`space-y-2 transition-all duration-200 ${previewFile ? "xl:mr-[280px]" : ""}`}
                  >
                    {(filesQuery.data ?? []).map((file) => {
                      const isSelected = selectedFileIds.has(file.id)
                      return (
                        <div
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          onDoubleClick={() => void openInOS(file.path)}
                          className={`rounded-[7px] border bg-s2/40 p-2 cursor-default select-none transition-colors ${
                            isSelected ? "border-blue-500/40 bg-[var(--bd)]" : "border-b1 hover:bg-s2/70"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFileSelection(file.id)}
                              className="mt-1 flex-shrink-0 accent-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] text-tx truncate inline-flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-tx3" />
                                {file.name}
                              </p>
                              <p className="text-[10px] text-tx3 font-mono truncate">{file.original_path ?? file.path}</p>
                              <p className="text-[10px] text-tx3 font-mono">{formatSize(file.size)}</p>
                            </div>

                            <div className="flex gap-1 flex-shrink-0">
                              {/* Preview toggle */}
                              <button
                                type="button"
                                title="Preview"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewFile((prev) => (prev?.id === file.id ? null : file))
                                }}
                                className={`h-7 px-2 rounded-[7px] border text-[11px] transition-colors ${
                                  previewFile?.id === file.id
                                    ? "border-blue-500/30 bg-[var(--bd)] text-blue-300"
                                    : "border-b1 bg-s2 text-tx2 hover:bg-s3"
                                }`}
                              >
                                {previewFile?.id === file.id ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void indexFileHandler(file.id)
                                }}
                                className="h-7 px-2 rounded-[7px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3"
                                disabled={indexingId === file.id}
                              >
                                {indexingId === file.id ? "Indexing..." : "Index"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void deleteFile.mutateAsync({ fileId: file.id, folderId: selectedFolder.id })
                                }}
                                className="h-7 px-2 rounded-[7px] border border-rose-500/25 bg-[var(--rd)] text-[11px] text-rose-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-mono pl-5">
                            <span className={file.indexed ? "text-emerald-300" : "text-tx3"}>
                              {file.indexed ? "indexed" : "not indexed"}
                            </span>
                            {file.indexed && (
                              <span className="text-tx3">{file.chunk_count} chunks</span>
                            )}
                            <span className="text-tx3 ml-auto">Double-click to open</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>                </>
              )}
            {/* Preview sidebar — fixed right panel, shown when previewFile is set */}
            {previewFile && (
              <div className="fixed top-0 right-0 h-full w-[280px] border-l border-b1 bg-s1 z-40 flex flex-col shadow-2xl animate-slideInRight">
                <div className="flex items-center justify-between px-3 py-2 border-b border-b1">
                  <p className="text-[12px] font-semibold text-tx truncate">{previewFile.name}</p>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="w-6 h-6 rounded-[5px] text-tx3 hover:text-tx hover:bg-s2 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {/* Metadata */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">File Info</p>
                    <div className="space-y-1.5">
                      {[
                        { label: "Name", value: previewFile.name },
                        { label: "Size", value: formatSize(previewFile.size) },
                        { label: "Index status", value: previewFile.indexed ? "Indexed" : "Not indexed" },
                        { label: "Chunks", value: previewFile.indexed ? String(previewFile.chunk_count ?? 0) : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start gap-2">
                          <span className="text-[11px] text-tx3 font-mono flex-shrink-0">{label}</span>
                          <span className={`text-[11px] text-right break-all ${
                            label === "Index status"
                              ? previewFile.indexed ? "text-emerald-300" : "text-tx3"
                              : "text-tx2"
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Path */}
                  <div>
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide mb-1">Path</p>
                    <p className="text-[10px] font-mono text-tx3 break-all leading-relaxed bg-s2 rounded-[6px] border border-b1 p-2">
                      {previewFile.path ?? "—"}
                    </p>
                  </div>

                  {/* Quick actions */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">Actions</p>
                    <button
                      type="button"
                      onClick={() => void openInOS(previewFile.path)}
                      className="w-full h-8 rounded-[7px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3 inline-flex items-center justify-center gap-1.5"
                    >
                      Open in OS
                    </button>
                    <button
                      type="button"
                      disabled={indexingId === previewFile.id}
                      onClick={() => void indexFileHandler(previewFile.id)}
                      className="w-full h-8 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                    >
                      {indexingId === previewFile.id ? "Indexing..." : previewFile.indexed ? "Re-index" : "Index Now"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </section>
          </div>
        </div>
      )}

      <Dialog open={newCourseOpen} onOpenChange={setNewCourseOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-tx3">Course name *</label>
              <input
                value={newCourse.name}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Organic Chemistry"
                className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-tx3">Course code</label>
              <input
                value={newCourse.code}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. CHEM201"
                className="mt-1 h-9 w-full rounded-[7px] border border-b1 bg-s2 px-3 text-[12px] text-tx outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-tx3 block mb-2">Colour</label>
              <div className="flex gap-2 flex-wrap">
                {COURSE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCourse((prev) => ({ ...prev, color }))}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      newCourse.color === color ? "ring-2 ring-offset-2 ring-offset-s1 ring-white scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setNewCourseOpen(false)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void createCourseHandler()}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600"
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}














