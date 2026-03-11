import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Course, Quiz, QuizAttempt, QuizQuestion, StudyMaterial, StudyMaterialType } from "@/types"
import { toast } from "sonner"

interface QuizGenerateRequest {
  title: string
  course_id: number
  difficulty: "easy" | "medium" | "hard"
  n_questions: number
  provider?: "groq" | "local" | "ollama"
  folder_id?: number
  file_id?: number
}

interface QuestionResult {
  question_id: number
  correct: boolean
  chosen: string
  answer: string
  explanation: string
}

export function useStudyHubCourses() {
  return useQuery({
    queryKey: ["study-hub", "courses"],
    queryFn: async () => {
      const courses = await api.get<Course[]>("/notes/courses")
      const perCourse = await Promise.all(
        courses.map(async (course) => {
          const [quizzes, notes, sheets] = await Promise.all([
            api
              .get<Quiz[]>(`/quizzes?course_id=${course.id}`)
              .then((q) => q.length)
              .catch(() => 0),
            api
              .get<StudyMaterial[]>(`/study-materials?course_id=${course.id}&type=study_notes`)
              .then((m) => m.length)
              .catch(() => 0),
            api
              .get<StudyMaterial[]>(`/study-materials?course_id=${course.id}&type=formula_sheet`)
              .then((m) => m.length)
              .catch(() => 0),
          ])
          return { id: course.id, quiz_count: quizzes, notes_count: notes, sheets_count: sheets }
        })
      )
      return courses.map((course) => {
        const counts = perCourse.find((c) => c.id === course.id)
        return {
          ...course,
          quiz_count: counts?.quiz_count ?? 0,
          notes_count: counts?.notes_count ?? 0,
          sheets_count: counts?.sheets_count ?? 0,
        }
      })
    },
  })
}

export function useQuizzes(courseId: number | null) {
  return useQuery({
    queryKey: ["study-hub", "quizzes", courseId],
    queryFn: () => api.get<Quiz[]>(`/quizzes${courseId ? `?course_id=${courseId}` : ""}`),
    enabled: courseId !== null,
  })
}

export function useGenerateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuizGenerateRequest) => api.post("/quizzes/generate", payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["study-hub", "quizzes"] })
      await qc.invalidateQueries({ queryKey: ["study-hub", "courses"] })
    },
  })
}

export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (quizId: number) => api.delete<void>(`/quizzes/${quizId}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["study-hub", "quizzes"] })
      await qc.invalidateQueries({ queryKey: ["study-hub", "courses"] })
    },
  })
}

export function useSubmitAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ quizId, answers, timeTaken }: { quizId: number; answers: Record<number, string>; timeTaken: number }) =>
      api.post<{
        score: number
        correct: number
        total: number
        xp_earned: number
        results: QuestionResult[]
      }>(`/quizzes/${quizId}/attempts`, { answers, time_taken: timeTaken }),
    onSuccess: async (_result, variables) => {
      await qc.invalidateQueries({ queryKey: ["study-hub", "quizzes"] })
      await qc.invalidateQueries({ queryKey: ["study-hub", "quiz", variables.quizId] })
      await qc.invalidateQueries({ queryKey: ["study-hub", "quiz-attempts", variables.quizId] })
      await qc.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useQuizDetail(quizId: number | null) {
  return useQuery({
    queryKey: ["study-hub", "quiz", quizId],
    queryFn: () => api.get<{ quiz: Quiz; questions: QuizQuestion[] }>(`/quizzes/${quizId}`),
    enabled: quizId !== null,
  })
}

export function useQuizAttempts(quizId: number | null) {
  return useQuery({
    queryKey: ["study-hub", "quiz-attempts", quizId],
    queryFn: () => api.get<QuizAttempt[]>(`/quizzes/${quizId}/attempts`),
    enabled: quizId !== null,
  })
}

export function useStudyMaterials(courseId: number | null, type: StudyMaterialType | null) {
  return useQuery({
    queryKey: ["study-hub", "materials", courseId, type],
    queryFn: () =>
      api.get<StudyMaterial[]>(
        `/study-materials?course_id=${courseId}${type ? `&type=${type}` : ""}`
      ),
    enabled: courseId !== null && type !== null,
  })
}

export function useDeleteStudyMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (materialId: number) => api.delete<void>(`/study-materials/${materialId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-hub", "materials"] })
      qc.invalidateQueries({ queryKey: ["study-hub", "courses"] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete"
      toast.error(message)
    },
  })
}
