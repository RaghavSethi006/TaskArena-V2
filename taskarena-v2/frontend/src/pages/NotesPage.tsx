import { open } from "@tauri-apps/plugin-dialog"
import { BookOpen, FileText, Folder as FolderIcon, Search, Upload } from "lucide-react"
import { useMemo, useState } from "react"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import {
  useCourseSearch,
  useCourses,
  useCreateFile,
  useCreateFolder,
  useDeleteFile,
  useFiles,
  useFolders,
  useIndexFile,
} from "@/hooks/useNotes"
import type { Course, Folder } from "@/types"
import { toast } from "sonner"

function formatSize(size: number | null): string {
  if (!size) return "-"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function NotesPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [search, setSearch] = useState("")
  const [indexingId, setIndexingId] = useState<number | null>(null)

  const coursesQuery = useCourses()
  const foldersQuery = useFolders(selectedCourse?.id ?? null)
  const filesQuery = useFiles(selectedFolder?.id ?? null)
  const searchQuery = useCourseSearch(selectedCourse?.id ?? null, search, selectedFolder?.id)
  const createFolder = useCreateFolder()
  const createFile = useCreateFile()
  const deleteFile = useDeleteFile()
  const indexFile = useIndexFile()

  const courseStats = useMemo(() => {
    const folders = foldersQuery.data ?? []
    const fileCount = filesQuery.data?.length ?? 0
    return { folderCount: folders.length, fileCount }
  }, [filesQuery.data?.length, foldersQuery.data])

  const pickFile = async () => {
    if (!selectedFolder) return
    let pickedPath: string | null = null
    try {
      const result = await open({
        multiple: false,
        filters: [{ name: "Documents", extensions: ["pdf", "docx", "txt", "md"] }],
      })
      pickedPath = Array.isArray(result) ? result[0] ?? null : result
    } catch {
      const manual = window.prompt("Paste file path")
      pickedPath = manual?.trim() || null
    }

    if (!pickedPath) return
    const name = pickedPath.split(/[\\/]/).pop() ?? "file"
    await createFile.mutateAsync({ folderId: selectedFolder.id, name, path: pickedPath })
    toast.success("File added")
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

  if (coursesQuery.isLoading) {
    return <LoadingSkeleton rows={8} />
  }

  if (!selectedCourse) {
    return (
      <div className="animate-fadeUp">
        <PageHeader title="Study Library" subtitle="Browse courses and files." />
        {(coursesQuery.data ?? []).length === 0 ? (
          <EmptyState title="No courses found" description="Seed or create courses to start." />
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
                  <p className="text-[14px] font-semibold text-tx">{course.name}</p>
                  <p className="text-[11px] text-tx3 font-mono mt-0.5">{course.code}</p>
                  {/* TODO: replace "-" with real counts once GET /api/notes/courses/summary is added */}
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-tx3 font-mono">
                    <span className="flex items-center gap-1">
                      <FolderIcon className="w-3 h-3" /> - folders
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> - files
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
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
                onClick={() => setSelectedFolder(folder)}
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
                <button
                  type="button"
                  onClick={() => void pickFile()}
                  className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Add File
                </button>
              </div>

              {search.trim().length > 1 ? (
                <div className="space-y-2 mb-3">
                  {(searchQuery.data ?? []).map((item) => (
                    <div key={`${item.file_id}-${item.score}`} className="rounded-[7px] border border-b1 bg-s2/40 p-2">
                      <p className="text-[11px] text-blue-300 font-mono">Score {item.score.toFixed(3)} · {item.file_name}</p>
                      <p className="text-[12px] text-tx2 mt-1">{item.preview}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                {(filesQuery.data ?? []).map((file) => (
                  <div key={file.id} className="rounded-[7px] border border-b1 bg-s2/40 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] text-tx truncate inline-flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-tx3" />
                          {file.name}
                        </p>
                        <p className="text-[10px] text-tx3 font-mono truncate">{file.original_path ?? file.path}</p>
                        <p className="text-[10px] text-tx3 font-mono">{formatSize(file.size)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void indexFileHandler(file.id)}
                          className="h-7 px-2 rounded-[7px] border border-b1 bg-s2 text-[11px] text-tx2 hover:bg-s3"
                          disabled={indexingId === file.id}
                        >
                          {indexingId === file.id ? "Indexing..." : "Index"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteFile.mutateAsync({ fileId: file.id, folderId: selectedFolder.id })}
                          className="h-7 px-2 rounded-[7px] border border-rose-500/25 bg-[var(--rd)] text-[11px] text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] font-mono">
                      {file.indexed ? (
                        <span className="text-emerald-300">indexed ({file.chunk_count} chunks)</span>
                      ) : (
                        <span className="text-tx3">not indexed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
