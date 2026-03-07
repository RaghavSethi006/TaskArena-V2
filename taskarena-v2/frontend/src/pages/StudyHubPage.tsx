import { Brain, Plus, ScrollText, Trash2 } from "lucide-react"
import { useState } from "react"
import { getBaseApiUrl } from "@/api/client"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFiles, useFolders } from "@/hooks/useNotes"
import {
  useDeleteQuiz,
  useQuizDetail,
  useQuizzes,
  useStudyHubCourses,
  useSubmitAttempt,
} from "@/hooks/useStudyHub"
import type { Course, QuizQuestion } from "@/types"
import { toast } from "sonner"

type MaterialTab = "quizzes" | "study-notes" | "revision" | "formula" | "qa" | "exams"
type ScopeMode = "course" | "folder" | "file"

const TAB_OPTIONS: Array<{ key: MaterialTab; label: string }> = [
  { key: "quizzes", label: "Quizzes" },
  { key: "study-notes", label: "Study Notes" },
  { key: "revision", label: "Revision" },
  { key: "formula", label: "Formula Sheet" },
  { key: "qa", label: "Q&A" },
  { key: "exams", label: "Practice Exams" },
]

export default function StudyHubPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<MaterialTab>("quizzes")
  const [generateOpen, setGenerateOpen] = useState(false)
  const [scope, setScope] = useState<ScopeMode>("course")
  const [folderId, setFolderId] = useState("")
  const [fileId, setFileId] = useState("")
  const [provider, setProvider] = useState<"groq" | "local" | "ollama">("groq")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [nQuestions, setNQuestions] = useState(10)
  const [genSteps, setGenSteps] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [takingQuizId, setTakingQuizId] = useState<number | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [quizResult, setQuizResult] = useState<{
    score: number
    correct: number
    total: number
    xp_earned: number
    results: Array<{
      question_id: number
      correct: boolean
      chosen: string
      answer: string
      explanation: string
    }>
  } | null>(null)

  const coursesQuery = useStudyHubCourses()
  const quizzesQuery = useQuizzes(selectedCourse?.id ?? null)
  const deleteQuiz = useDeleteQuiz()
  const quizDetailQuery = useQuizDetail(takingQuizId)
  const submitAttempt = useSubmitAttempt()
  const foldersQuery = useFolders(selectedCourse?.id ?? null)
  const filesQuery = useFiles(
    scope === "file" && folderId ? Number(folderId) : scope === "folder" && folderId ? Number(folderId) : null
  )

  const startQuiz = (quizId: number) => {
    setTakingQuizId(quizId)
    setCurrentQuestion(0)
    setAnswers({})
    setQuizResult(null)
  }

  const submitQuiz = async () => {
    if (!takingQuizId) return
    const result = await submitAttempt.mutateAsync({ quizId: takingQuizId, answers, timeTaken: 0 })
    setQuizResult({
      score: result.score,
      correct: result.correct,
      total: result.total,
      xp_earned: result.xp_earned,
      results: result.results ?? [],
    })
    toast.success(`Quiz complete! +${result.xp_earned} XP`)
  }

  const runGeneration = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    setGenSteps([])

    try {
      const baseApiUrl = await getBaseApiUrl()
      const response = await fetch(`${baseApiUrl}/quizzes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          folder_id: scope === "folder" || scope === "file" ? Number(folderId || 0) || null : null,
          file_id: scope === "file" ? Number(fileId || 0) || null : null,
          n_questions: nQuestions,
          difficulty,
          provider,
        }),
      })

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6)) as {
            step?: string
            progress?: number
            total?: number
            done?: boolean
            error?: string
          }
          if (data.step) setGenSteps((prev) => [...prev, `${data.step} (${data.progress}/${data.total})`])
          if (data.done) {
            toast.success("Quiz generated")
            await quizzesQuery.refetch()
            setGenerateOpen(false)
          }
          if (data.error) toast.error(data.error)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed"
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  if (coursesQuery.isLoading) {
    return <LoadingSkeleton rows={8} />
  }

  if (!selectedCourse) {
    return (
      <div className="animate-fadeUp">
        <PageHeader title="Study Hub" subtitle="All generated study materials in one place." />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(coursesQuery.data ?? []).map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setSelectedCourse(course)}
              className="group rounded-[12px] border border-b1 bg-s1 text-left hover:border-b2 transition-all duration-[120ms] overflow-hidden"
            >
              <div className="h-1" style={{ backgroundColor: course.color }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[14px] font-semibold text-tx">{course.name}</p>
                    <p className="text-[11px] text-tx3 font-mono">{course.code}</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${course.color}20` }}
                  >
                    <Brain className="w-4 h-4" style={{ color: course.color }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-[7px] bg-s2/60 border border-b1 p-2 text-center">
                    <p className="text-[15px] font-bold text-tx font-mono">{course.quiz_count ?? 0}</p>
                    <p className="text-[9px] text-tx3 uppercase tracking-wide mt-0.5">Quizzes</p>
                  </div>
                  <div className="rounded-[7px] bg-s2/60 border border-b1 p-2 text-center">
                    <p className="text-[15px] font-bold text-tx font-mono">0</p>
                    <p className="text-[9px] text-tx3 uppercase tracking-wide mt-0.5">Notes</p>
                  </div>
                  <div className="rounded-[7px] bg-s2/60 border border-b1 p-2 text-center">
                    <p className="text-[15px] font-bold text-tx font-mono">0</p>
                    <p className="text-[9px] text-tx3 uppercase tracking-wide mt-0.5">Sheets</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-tx3 font-mono">Tap to browse materials -&gt;</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (takingQuizId) {
    const questions = quizDetailQuery.data?.questions ?? []
    const question = questions[currentQuestion]

    return (
      <div className="animate-fadeUp h-full">
        <div className="max-w-3xl mx-auto flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold">{quizDetailQuery.data?.quiz.title ?? "Quiz"}</h2>
              {!quizResult ? (
                <p className="text-[12px] text-tx3 font-mono mt-0.5">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setTakingQuizId(null)
                setQuizResult(null)
              }}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
            >
              &larr; Back to Hub
            </button>
          </div>

          {!quizResult ? (
            <div className="h-1.5 bg-s2 rounded-full mb-5 border border-b1">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: questions.length > 0 ? `${((currentQuestion + 1) / questions.length) * 100}%` : "0%" }}
              />
            </div>
          ) : null}

          {quizResult ? (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="rounded-[12px] border border-b1 bg-s1 p-6 text-center">
                <p
                  className={`text-[52px] font-bold font-mono ${
                    quizResult.score >= 80 ? "text-emerald-400"
                    : quizResult.score >= 60 ? "text-amber-400"
                    : "text-rose-400"
                  }`}
                >
                  {quizResult.score.toFixed(0)}%
                </p>
                <p className="text-[15px] text-tx2 mt-1">
                  {quizResult.correct} / {quizResult.total} correct
                </p>
                <p className="text-[13px] text-blue-300 font-mono mt-1">
                  +{quizResult.xp_earned} XP earned
                </p>
              </div>

              <div className="space-y-3">
                {(quizDetailQuery.data?.questions ?? []).map((q, idx) => {
                  const r = quizResult.results.find((res) => res.question_id === q.id)
                  if (!r) return null

                  const correctLetter = r.answer.toUpperCase()
                  const chosenLetter = r.chosen.toUpperCase()
                  const correctText = q[`option_${r.answer}` as keyof typeof q] as string

                  return (
                    <div
                      key={q.id}
                      className={`rounded-[12px] border bg-s1 p-4 ${
                        r.correct ? "border-emerald-500/25" : "border-rose-500/25"
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] flex-shrink-0 mt-0.5 ${
                            r.correct
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {r.correct ? "✓ Correct" : "✗ Wrong"}
                        </span>
                        <p className="text-[13px] text-tx leading-snug">
                          Q{idx + 1}. {q.question}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {!r.correct ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[5px] bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            You chose: {chosenLetter}. {q[`option_${r.chosen}` as keyof typeof q] as string || "—"}
                          </span>
                        ) : null}
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-[5px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Correct: {correctLetter}. {correctText}
                        </span>
                      </div>

                      {r.explanation ? (
                        <div className="rounded-[7px] bg-s2/60 border border-b1 p-2.5">
                          <p className="text-[10px] text-tx3 font-mono uppercase tracking-wide mb-1">Explanation</p>
                          <p className="text-[12px] text-tx2 leading-relaxed">{r.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentQuestion(0)
                    setAnswers({})
                    setQuizResult(null)
                  }}
                  className="h-9 px-4 rounded-[7px] border border-b1 bg-s2 text-[13px] text-tx2 hover:bg-s3"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTakingQuizId(null)
                    setQuizResult(null)
                  }}
                  className="h-9 px-4 rounded-[7px] bg-blue-500 text-white text-[13px] hover:bg-blue-600"
                >
                  Back to Hub
                </button>
              </div>
            </div>
          ) : question ? (
            <div className="rounded-[12px] border border-b1 bg-s1 p-6 flex-1">
              <p className="text-[16px] text-tx mb-6 leading-relaxed">{question.question}</p>
              <div className="space-y-3">
                {(["a", "b", "c", "d"] as const).map((key) => {
                  const value = question[`option_${key}` as keyof QuizQuestion] as string
                  const selected = answers[question.id] === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: key }))}
                      className={`w-full text-left rounded-[10px] border px-4 py-3 text-[13px] transition-all duration-[120ms] ${
                        selected
                          ? "border-blue-500/50 bg-[var(--bd)] text-blue-200"
                          : "border-b1 bg-s2/60 text-tx2 hover:bg-s2 hover:border-b2"
                      }`}
                    >
                      <span className="font-mono text-tx3 mr-2">{key.toUpperCase()}.</span>
                      {value}
                    </button>
                  )
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
                  disabled={currentQuestion === 0}
                  className="h-9 px-4 rounded-[7px] border border-b1 bg-s2 text-[13px] text-tx2 hover:bg-s3 disabled:opacity-30"
                >
                  &larr; Previous
                </button>
                {currentQuestion < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestion((value) => value + 1)}
                    disabled={!answers[question.id]}
                    className="h-9 px-4 rounded-[7px] bg-blue-500 text-white text-[13px] hover:bg-blue-600 disabled:opacity-40"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submitQuiz()}
                    disabled={!answers[question.id]}
                    className="h-9 px-4 rounded-[7px] bg-green-600 text-white text-[13px] hover:bg-green-700 disabled:opacity-40"
                  >
                    Finish Quiz
                  </button>
                )}
              </div>
            </div>
          ) : (
            <LoadingSkeleton rows={6} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Study Hub"
        subtitle={`Study Hub > ${selectedCourse.name}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setGenerateOpen(true)}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate
            </button>
            <button
              type="button"
              onClick={() => setSelectedCourse(null)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
            >
              Back
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-8 px-3 rounded-[7px] border text-[12px] ${
              activeTab === tab.key ? "bg-[var(--bd)] border-blue-500/30 text-blue-300" : "bg-s2 border-b1 text-tx2 hover:bg-s3"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== "quizzes" ? (
        <EmptyState title="Coming soon" description="Material generation for this tab arrives in Phase 3E+" />
      ) : (quizzesQuery.data ?? []).length === 0 ? (
        <EmptyState title="No quizzes yet" description="Generate your first quiz from this course." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(quizzesQuery.data ?? []).map((quiz) => {
            const scoreColor =
              quiz.best_score === null ? "text-tx3"
              : quiz.best_score >= 80 ? "text-green-400"
              : quiz.best_score >= 60 ? "text-amber-400"
              : "text-rose-400"

            return (
              <div
                key={quiz.id}
                className="rounded-[12px] border border-b1 bg-s1 overflow-hidden hover:border-b2 transition-colors"
              >
                <div
                  className={`h-1 ${
                    quiz.difficulty === "easy"
                      ? "bg-green-500"
                      : quiz.difficulty === "medium"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-tx truncate">{quiz.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] uppercase ${
                            quiz.difficulty === "easy"
                              ? "bg-green-500/15 text-green-400"
                              : quiz.difficulty === "medium"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {quiz.difficulty}
                        </span>
                        <span className="text-[10px] text-tx3 font-mono">{quiz.question_count} questions</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteQuiz.mutateAsync(quiz.id)}
                      className="text-tx3 hover:text-rose-300 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-[7px] bg-s2/60 border border-b1 p-2">
                      <p className="text-[10px] text-tx3 font-mono">Best Score</p>
                      <p className={`text-[16px] font-bold font-mono mt-0.5 ${scoreColor}`}>
                        {quiz.best_score !== null ? `${quiz.best_score.toFixed(0)}%` : "-"}
                      </p>
                    </div>
                    <div className="rounded-[7px] bg-s2/60 border border-b1 p-2">
                      <p className="text-[10px] text-tx3 font-mono">Attempts</p>
                      <p className="text-[16px] font-bold font-mono text-tx mt-0.5">{quiz.attempt_count}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startQuiz(quiz.id)}
                    className="h-8 w-full rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ScrollText className="w-3.5 h-3.5" />
                    {quiz.attempt_count > 0 ? "Retake Quiz" : "Start Quiz"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Generate Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-[12px] text-tx2">Scope</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScope("course")}
                className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "course" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}
              >
                Whole course
              </button>
              <button
                type="button"
                onClick={() => setScope("folder")}
                className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "folder" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}
              >
                Specific folder
              </button>
              <button
                type="button"
                onClick={() => setScope("file")}
                className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "file" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}
              >
                Specific file
              </button>
            </div>
            {scope === "folder" || scope === "file" ? (
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="">Select folder</option>
                {(foldersQuery.data ?? []).map((folder) => (
                  <option key={folder.id} value={String(folder.id)}>
                    {folder.name}
                  </option>
                ))}
              </select>
            ) : null}
            {scope === "file" ? (
              <select
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="">Select file</option>
                {(filesQuery.data ?? []).map((file) => (
                  <option key={file.id} value={String(file.id)}>
                    {file.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "groq" | "local" | "ollama")}
                className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="groq">Groq</option>
                <option value="local">Local</option>
                <option value="ollama">Ollama</option>
              </select>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input
                value={String(nQuestions)}
                onChange={(e) => setNQuestions(Number(e.target.value || 10))}
                type="number"
                min={5}
                max={30}
                className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx outline-none"
              />
            </div>
            {genSteps.length > 0 ? (
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2 max-h-[110px] overflow-y-auto">
                {genSteps.map((step, idx) => (
                  <p key={`${step}-${idx}`} className="text-[11px] text-tx2">
                    {step}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setGenerateOpen(false)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={generating}
              className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
