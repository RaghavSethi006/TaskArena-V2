import { open } from "@tauri-apps/plugin-dialog"
import { open as shellOpen } from "@tauri-apps/plugin-shell"
import {
  BookOpen,
  ExternalLink,
  FileCode,
  FileImage,
  FileText,
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react"
import { useMemo, useState } from "react"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { useUIStore } from "@/stores/uiStore"
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
import type { Course, File, Folder } from "@/types"
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

function FileTypeIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["pdf"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
  if (["doc", "docx"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
  if (["md", "txt"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
    return <FileImage className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
  return <FileText className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />
}

export default function NotesPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [newCourseOpen, setNewCourseOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: "", code: "", color: "#3b82f6" })
  const [newFolderName, setNewFolderName] = useState("")
  const [search, setSearch] = useState("")
  const [indexingIds, setIndexingIds] = useState<Set<number>>(new Set())
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set())
  const { preferences, setPreference } = useUIStore()
  const autoIndex = preferences.autoIndexFiles
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

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

  const deleteCourseHandler = (courseId: number, courseName: string) => {
    setConfirm({
      title: "Delete Course",
      description: `"${courseName}" and ALL its folders, files, and quizzes will be permanently deleted.`,
      confirmLabel: "Delete Course",
      onConfirm: async () => {
        setConfirm(null)
        await deleteCourse.mutateAsync(courseId)
        toast.success("Course deleted")
      },
    })
  }

  const createFolderHandler = async () => {
    if (!selectedCourse || !newFolderName.trim()) return
    await createFolder.mutateAsync({ courseId: selectedCourse.id, name: newFolderName.trim() })
    setNewFolderName("")
    toast.success("Folder created")
  }

  const indexFileHandler = async (fileId: number) => {
    setIndexingIds((prev) => new Set([...prev, fileId]))
    try {
      const result = await indexFile.mutateAsync({ fileId })
      toast.success(`Indexed ${result.chunks_created} chunks`)
      if (previewFile?.id === fileId) {
        setPreviewFile((prev) => prev ? { ...prev, indexed: true } : prev)
      }
    } finally {
      setIndexingIds((prev) => {
        const next = new Set(prev)
        next.delete(fileId)
        return next
      })
    }
  }

  const openInOS = async (file: File) => {
    const path = file.original_path ?? file.path ?? ""
    if (!path) {
      toast.error("No path available for this file.")
      return
    }
    try {
      await shellOpen(path)
    } catch {
      toast.error("Could not open file - check the path still exists.")
    }
  }

  const toggleFileSelection = (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const bulkOpen = async () => {
    for (const fileId of selectedFileIds) {
      const file = (filesQuery.data ?? []).find((f) => f.id === fileId)
      if (file) await openInOS(file)
    }
  }

  const bulkIndex = async () => {
    const ids = [...selectedFileIds]
    toast(`Indexing ${ids.length} file${ids.length > 1 ? "s" : ""}...`)
    await Promise.all(ids.map((id) => indexFileHandler(id)))
    setSelectedFileIds(new Set())
  }

  const bulkDeleteHandler = () => {
    const count = selectedFileIds.size
    setConfirm({
      title: `Delete ${count} File${count > 1 ? "s" : ""}`,
      description: `${count} file${count > 1 ? "s" : ""} and all their indexed content will be permanently removed.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null)
        if (!selectedFolder) return
        for (const fileId of selectedFileIds) {
          await deleteFile.mutateAsync({ fileId, folderId: selectedFolder.id })
        }
        setSelectedFileIds(new Set())
        if (previewFile && selectedFileIds.has(previewFile.id)) setPreviewFile(null)
        toast.success(`${count} file${count > 1 ? "s" : ""} deleted`)
      },
    })
  }

  const deleteSingleFile = (file: File) => {
    if (!selectedFolder) return
    setConfirm({
      title: "Delete File",
      description: `"${file.name}" and its indexed content will be permanently removed.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirm(null)
        await deleteFile.mutateAsync({ fileId: file.id, folderId: selectedFolder.id })
        if (previewFile?.id === file.id) setPreviewFile(null)
        setSelectedFileIds((prev) => {
          const next = new Set(prev)
          next.delete(file.id)
          return next
        })
        toast.success("File deleted")
      },
    })
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
        <div className="animate-fadeUp flex flex-col" style={{ height: "calc(100vh - 50px - 48px - 2rem)" }}>
          {/* Breadcrumb header */}
          <PageHeader
            title="Study Library"
            subtitle={`${selectedCourse.name}${selectedFolder ? ` / ${selectedFolder.name}` : ""}`}
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

          {/* Main 3-column layout: folders | files | preview */}
          <div className="flex flex-1 gap-3 min-h-0 overflow-hidden">

            {/* -- Folder sidebar -- */}
            <div className="w-[200px] flex-shrink-0 rounded-[10px] border border-b1 bg-s1 flex flex-col overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-b1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-tx2">
                  Folders <span className="text-tx3 font-normal">({courseStats.folderCount})</span>
                </span>
              </div>

              {/* Folder list - scrolls independently */}
              <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                {(foldersQuery.data ?? []).length === 0 ? (
                  <p className="text-[11px] text-tx3 text-center py-4">No folders yet</p>
                ) : (
                  (foldersQuery.data ?? []).map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolder(folder)
                        setSelectedFileIds(new Set())
                        setPreviewFile(null)
                        setSearch("")
                      }}
                      className={`w-full text-left rounded-[6px] px-2 py-2 text-[12px] border transition-colors ${
                        selectedFolder?.id === folder.id
                          ? "border-blue-500/30 bg-[var(--bd)] text-blue-200"
                          : "border-transparent hover:bg-s2 text-tx2"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        {selectedFolder?.id === folder.id
                          ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                          : <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        }
                        <span className="truncate">{folder.name}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* New folder input - pinned to bottom */}
              <div className="p-2 border-t border-b1">
                <div className="flex gap-1.5">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void createFolderHandler() }}
                    placeholder="New folder..."
                    className="flex-1 h-7 rounded-[6px] border border-b1 bg-s2 px-2 text-[11px] text-tx outline-none placeholder:text-tx3"
                  />
                  <button
                    type="button"
                    onClick={() => void createFolderHandler()}
                    disabled={!newFolderName.trim()}
                    className="h-7 w-7 rounded-[6px] bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* -- File panel -- */}
            <div className="flex-1 min-w-0 rounded-[10px] border border-b1 bg-s1 flex flex-col overflow-hidden">

              {!selectedFolder ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    title="Select a folder"
                    description="Choose a folder from the left to view its files."
                    icon={FolderIcon}
                  />
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="px-3 pt-3 pb-2 border-b border-b1 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Search */}
                      <div className="flex-1 h-8 rounded-[7px] border border-b1 bg-s2 px-2.5 inline-flex items-center gap-2 min-w-0">
                        <Search className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search indexed content..."
                          className="bg-transparent flex-1 text-[12px] text-tx outline-none min-w-0"
                        />
                        {search && (
                          <button type="button" onClick={() => setSearch("")} className="text-tx3 hover:text-tx">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Auto-index toggle */}
                      <button
                        type="button"
                        onClick={() => setPreference("autoIndexFiles", !autoIndex)}
                        title={autoIndex ? "Auto-index ON" : "Auto-index OFF"}
                        className={`h-8 px-2.5 rounded-[7px] border text-[11px] font-mono flex-shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                          autoIndex
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                            : "bg-s2 border-b1 text-tx3"
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span className="hidden sm:inline">{autoIndex ? "Auto" : "Manual"}</span>
                      </button>

                      {/* Add files */}
                      <button
                        type="button"
                        onClick={() => void pickFiles()}
                        className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 flex-shrink-0 inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Bulk action bar - shown only when files selected */}
                    {selectedFileIds.size > 0 && (
                      <div className="flex items-center gap-2 rounded-[7px] border border-blue-500/25 bg-[var(--bd)] px-3 py-1.5">
                        <span className="text-[11px] text-blue-300 flex-1 font-mono">
                          {selectedFileIds.size} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => void bulkOpen()}
                          className="h-6 px-2 rounded-[5px] bg-s2 border border-b1 text-[10px] text-tx2 hover:bg-s3 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Open All
                        </button>
                        <button
                          type="button"
                          onClick={() => void bulkIndex()}
                          className="h-6 px-2 rounded-[5px] bg-s2 border border-b1 text-[10px] text-tx2 hover:bg-s3 inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Index All
                        </button>
                        <button
                          type="button"
                          onClick={bulkDeleteHandler}
                          className="h-6 px-2 rounded-[5px] bg-rose-500/15 border border-rose-500/25 text-[10px] text-rose-300 hover:bg-rose-500/25 inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds(new Set())}
                          className="text-tx3 hover:text-tx ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search results */}
                  {search.trim().length > 1 && (
                    <div className="px-3 pt-2 space-y-1.5 border-b border-b1 pb-2 max-h-[180px] overflow-y-auto">
                      <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">
                        {(searchQuery.data ?? []).length} result{(searchQuery.data ?? []).length !== 1 ? "s" : ""} in indexed content
                      </p>
                      {(searchQuery.data ?? []).length === 0 ? (
                        <p className="text-[11px] text-tx3 py-1">No matches found.</p>
                      ) : (
                        (searchQuery.data ?? []).map((item) => {
                          const quality = item.score > 0.85 ? "Strong" : item.score > 0.7 ? "Good" : "Weak"
                          const qualityColor = item.score > 0.85 ? "text-emerald-400" : item.score > 0.7 ? "text-amber-400" : "text-tx3"
                          return (
                            <div
                              key={`${item.file_id}-${item.score}`}
                              className="rounded-[6px] border border-b1 bg-s2/40 px-2.5 py-2"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[11px] text-tx font-medium truncate">{item.file_name}</p>
                                <span className={`text-[10px] font-mono flex-shrink-0 ml-2 ${qualityColor}`}>{quality} match</span>
                              </div>
                              <p className="text-[11px] text-tx3 leading-relaxed line-clamp-2">{item.preview}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* File list - this is the ONLY thing that scrolls */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {filesQuery.isLoading ? (
                      <LoadingSkeleton rows={5} card={false} />
                    ) : (filesQuery.data ?? []).length === 0 ? (
                      <EmptyState
                        title="No files in this folder"
                        description="Click Add to upload PDFs, Word docs, or text files."
                        icon={FileText}
                        actionLabel="Add Files"
                        onAction={() => void pickFiles()}
                      />
                    ) : (
                      (filesQuery.data ?? []).map((file) => {
                        const isSelected = selectedFileIds.has(file.id)
                        const isPreviewing = previewFile?.id === file.id
                        const isIndexing = indexingIds.has(file.id)

                        return (
                          <div
                            key={file.id}
                            onDoubleClick={() => void openInOS(file)}
                            className={`group rounded-[8px] border px-3 py-2 select-none transition-colors cursor-default ${
                              isPreviewing
                                ? "border-blue-500/40 bg-[var(--bd)]"
                                : isSelected
                                  ? "border-blue-500/25 bg-blue-500/5"
                                  : "border-b1 bg-s2/30 hover:bg-s2/60 hover:border-b2"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Checkbox - stopPropagation prevents preview trigger */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleFileSelection(file.id, e as unknown as React.MouseEvent)
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0 accent-blue-500 cursor-pointer"
                              />

                              {/* File type icon */}
                              <FileTypeIcon name={file.name} />

                              {/* File info */}
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setPreviewFile(isPreviewing ? null : file)}
                              >
                                <p className="text-[12px] text-tx font-medium truncate">{file.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-tx3 font-mono">{formatSize(file.size)}</span>
                                  {file.indexed ? (
                                    <span className="text-[10px] text-emerald-400 font-mono">
                                      indexed {file.chunk_count ?? 0} chunks
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-tx3 font-mono">not indexed</span>
                                  )}
                                  {isIndexing && (
                                    <span className="text-[10px] text-amber-400 font-mono animate-pulse">indexing...</span>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons - visible on hover or when row is active */}
                              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  title="Open in system app"
                                  onClick={(e) => { e.stopPropagation(); void openInOS(file) }}
                                  className="h-6 w-6 rounded-[5px] text-tx3 hover:text-tx hover:bg-s2 flex items-center justify-center transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title={file.indexed ? "Re-index" : "Index file"}
                                  onClick={(e) => { e.stopPropagation(); void indexFileHandler(file.id) }}
                                  disabled={isIndexing}
                                  className="h-6 w-6 rounded-[5px] text-tx3 hover:text-blue-300 hover:bg-blue-500/10 flex items-center justify-center transition-colors disabled:opacity-40"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? "animate-spin" : ""}`} />
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={(e) => { e.stopPropagation(); deleteSingleFile(file) }}
                                  className="h-6 w-6 rounded-[5px] text-tx3 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* -- Preview panel - inline column, NOT fixed -- */}
            {previewFile && (
              <div className="w-[260px] flex-shrink-0 rounded-[10px] border border-b1 bg-s1 flex flex-col overflow-hidden animate-slideInRight">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-b1">
                  <FileTypeIcon name={previewFile.name} />
                  <p className="text-[12px] font-semibold text-tx truncate flex-1">{previewFile.name}</p>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="w-5 h-5 rounded-[4px] text-tx3 hover:text-tx hover:bg-s2 flex items-center justify-center flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">File Info</p>
                    <div className="space-y-1.5 rounded-[8px] border border-b1 bg-s2/40 p-2.5">
                      {[
                        { label: "Size", value: formatSize(previewFile.size) },
                        {
                          label: "Status",
                          value: previewFile.indexed ? "Indexed" : "Not indexed",
                          color: previewFile.indexed ? "text-emerald-400" : "text-tx3",
                        },
                        ...(previewFile.indexed
                          ? [{ label: "Chunks", value: `${previewFile.chunk_count ?? 0}` }]
                          : []),
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-[10px] text-tx3">{label}</span>
                          <span className={`text-[10px] font-mono ${color ?? "text-tx2"}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide mb-1.5">Path</p>
                    <div
                      className="text-[10px] font-mono text-tx3 break-all leading-relaxed bg-s2 rounded-[7px] border border-b1 p-2.5 cursor-pointer hover:bg-s3 transition-colors"
                      title="Click to copy"
                      onClick={() => {
                        void navigator.clipboard.writeText(previewFile.original_path ?? previewFile.path ?? "")
                        toast.success("Path copied")
                      }}
                    >
                      {previewFile.original_path ?? previewFile.path ?? "-"}
                    </div>
                    <p className="text-[9px] text-tx3 mt-1 text-center">click to copy</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-tx3 uppercase tracking-wide">Actions</p>
                    <button
                      type="button"
                      onClick={() => void openInOS(previewFile)}
                      className="w-full h-8 rounded-[7px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in System App
                    </button>
                    <button
                      type="button"
                      disabled={indexingIds.has(previewFile.id)}
                      onClick={() => void indexFileHandler(previewFile.id)}
                      className="w-full h-8 rounded-[7px] bg-blue-500 text-white text-[11px] hover:bg-blue-600 disabled:opacity-40 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${indexingIds.has(previewFile.id) ? "animate-spin" : ""}`} />
                      {indexingIds.has(previewFile.id) ? "Indexing..." : previewFile.indexed ? "Re-index" : "Index Now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSingleFile(previewFile)}
                      className="w-full h-8 rounded-[7px] border border-rose-500/25 bg-rose-500/10 text-[11px] text-rose-300 hover:bg-rose-500/20 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete File
                    </button>
                  </div>
                </div>
              </div>
            )}

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

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
















