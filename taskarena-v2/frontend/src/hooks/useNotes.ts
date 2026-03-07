import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Course, File, Folder } from "@/types"

interface SearchResult {
  file_id: number
  file_name: string
  score: number
  preview: string
}

export function useCourses() {
  return useQuery({
    queryKey: ["notes", "courses"],
    queryFn: () => api.get<Course[]>("/notes/courses"),
    placeholderData: keepPreviousData,
  })
}

export function useFolders(courseId: number | null) {
  return useQuery({
    queryKey: ["notes", "folders", courseId],
    queryFn: () => api.get<Folder[]>(`/notes/courses/${courseId}/folders`),
    enabled: courseId !== null,
  })
}

export function useFiles(folderId: number | null) {
  return useQuery({
    queryKey: ["notes", "files", folderId],
    queryFn: () => api.get<File[]>(`/notes/folders/${folderId}/files`),
    enabled: folderId !== null,
  })
}

export function useCourseSearch(courseId: number | null, q: string, folderId?: number | null) {
  return useQuery({
    queryKey: ["notes", "search", courseId, q, folderId],
    queryFn: () =>
      api.get<SearchResult[]>(
        `/notes/courses/${courseId}/search?q=${encodeURIComponent(q)}${folderId ? `&folder_id=${folderId}` : ""}`
      ),
    enabled: courseId !== null && q.trim().length > 1,
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, name }: { courseId: number; name: string }) =>
      api.post<Folder>(`/notes/courses/${courseId}/folders`, { name }),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ["notes", "folders", variables.courseId] }),
  })
}

export function useCreateFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, name, path }: { folderId: number; name: string; path: string }) =>
      api.post<File>(`/notes/folders/${folderId}/files`, { name, path }),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ["notes", "files", variables.folderId] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { fileId: number; folderId: number }) => api.delete<void>(`/notes/files/${variables.fileId}`),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ["notes", "files", variables.folderId] }),
  })
}

export function useIndexFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fileId }: { fileId: number }) =>
      api.post<{ chunks_created: number; file_id: number }>(`/notes/files/${fileId}/index`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", "files"] })
    },
  })
}
