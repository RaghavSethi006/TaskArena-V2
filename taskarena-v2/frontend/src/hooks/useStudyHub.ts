import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Course, Quiz, QuizAttempt, QuizQuestion } from "@/types"

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
      const counts = await Promise.all(
        courses.map((course) =>
          api
            .get<Quiz[]>(`/quizzes?course_id=${course.id}`)
            .then((quizzes) => ({ id: course.id, quiz_count: quizzes.length }))
            .catch(() => ({ id: course.id, quiz_count: 0 }))
        )
      )

      return courses.map((course) => ({
        ...course,
        quiz_count: counts.find((item) => item.id === course.id)?.quiz_count ?? 0,
      }))
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
