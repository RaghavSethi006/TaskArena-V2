import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api/client"
import type { Course, Quiz, QuizQuestion } from "@/types"

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
  })
}

export function useGenerateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: QuizGenerateRequest) => api.post("/quizzes/generate", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-hub", "quizzes"] }),
  })
}

export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (quizId: number) => api.delete<void>(`/quizzes/${quizId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-hub", "quizzes"] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
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
