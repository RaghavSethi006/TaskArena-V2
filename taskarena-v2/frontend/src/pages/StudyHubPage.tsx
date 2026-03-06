import { BookOpen, FlaskConical, Plus, ScrollText, Trash2 } from "lucide-react"
import { useState } from "react"
import { BASE_API } from "@/api/client"
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
  } | null>(null)

  const coursesQuery = useStudyHubCourses()
  const quizzesQuery = useQuizzes(selectedCourse?.id ?? null)
  const deleteQuiz = useDeleteQuiz()
  const quizDetailQuery = useQuizDetail(takingQuizId)
  const submitAttempt = useSubmitAttempt()
  const foldersQuery = useFolders(selectedCourse?.id ?? null)
  const filesQuery = useFiles(scope === "file" && folderId ? Number(folderId) : scope === "folder" && folderId ? Number(folderId) : null)

  const questions = quizDetailQuery.data?.questions ?? []
  const question = questions[currentQuestion]

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
    })
    toast.success(`Quiz complete! +${result.xp_earned} XP`)
  }

  const runGeneration = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    setGenSteps([])

    try {
      const response = await fetch(`${BASE_API}/quizzes/generate`, {
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
          const data = JSON.parse(line.slice(6)) as { step?: string; progress?: number; total?: number; done?: boolean; error?: string }
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

  if (coursesQuery.isLoading) return <LoadingSkeleton rows={8} />

  if (!selectedCourse) {
    return (
      <div className="animate-fadeUp">
        <PageHeader title="Study Hub" subtitle="All generated study materials in one place." />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(coursesQuery.data ?? []).map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setSelectedCourse(course)}
              className="rounded-[10px] border border-b1 bg-s1 overflow-hidden text-left hover:border-b2 transition-colors duration-[120ms]"
            >
              <div className="h-1.5" style={{ backgroundColor: course.color }} />
              <div className="p-4">
                <p className="text-[14px] font-semibold">{course.name}</p>
                <p className="text-[11px] text-tx3 font-mono mt-1">{course.code}</p>
                <div className="mt-3 text-[11px] text-tx2 space-y-1">
                  <p className="inline-flex items-center gap-1"><ScrollText className="w-3.5 h-3.5" /> {quizzesQuery.data?.length ?? 0} quizzes</p>
                  <p className="inline-flex items-center gap-1 ml-3"><BookOpen className="w-3.5 h-3.5" /> 0 notes</p>
                  <p className="inline-flex items-center gap-1 ml-3"><FlaskConical className="w-3.5 h-3.5" /> 0 sheets</p>
                </div>
              </div>
            </button>
          ))}
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
            <button type="button" onClick={() => setGenerateOpen(true)} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Generate
            </button>
            <button type="button" onClick={() => setSelectedCourse(null)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3">
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
          {(quizzesQuery.data ?? []).map((quiz) => (
            <div key={quiz.id} className="rounded-[10px] border border-b1 bg-s1 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[13px] font-semibold">{quiz.title}</h3>
                <button type="button" onClick={() => void deleteQuiz.mutateAsync(quiz.id)} className="text-tx3 hover:text-rose-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-tx3">
                {quiz.difficulty} · {quiz.question_count}q · {quiz.attempt_count} attempts
              </p>
              <p className="mt-1 text-[11px] text-tx3">Best score: {quiz.best_score ?? "N/A"}</p>
              <button type="button" onClick={() => startQuiz(quiz.id)} className="mt-3 h-8 w-full rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600">
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader><DialogTitle>Generate Quiz</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="text-[12px] text-tx2">Scope</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScope("course")} className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "course" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}>Whole course</button>
              <button type="button" onClick={() => setScope("folder")} className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "folder" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}>Specific folder</button>
              <button type="button" onClick={() => setScope("file")} className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === "file" ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}>Specific file</button>
            </div>
            {scope === "folder" || scope === "file" ? (
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
                <option value="">Select folder</option>
                {(foldersQuery.data ?? []).map((folder) => (
                  <option key={folder.id} value={String(folder.id)}>{folder.name}</option>
                ))}
              </select>
            ) : null}
            {scope === "file" ? (
              <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
                <option value="">Select file</option>
                {(filesQuery.data ?? []).map((file) => (
                  <option key={file.id} value={String(file.id)}>{file.name}</option>
                ))}
              </select>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <select value={provider} onChange={(e) => setProvider(e.target.value as "groq" | "local" | "ollama")} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
                <option value="groq">Groq</option>
                <option value="local">Local</option>
                <option value="ollama">Ollama</option>
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input value={String(nQuestions)} onChange={(e) => setNQuestions(Number(e.target.value || 10))} type="number" min={5} max={30} className="h-9 rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx outline-none" />
            </div>
            {genSteps.length > 0 ? (
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2 max-h-[110px] overflow-y-auto">
                {genSteps.map((step, idx) => (
                  <p key={`${step}-${idx}`} className="text-[11px] text-tx2">{step}</p>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setGenerateOpen(false)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3">Cancel</button>
            <button type="button" onClick={() => void runGeneration()} disabled={generating} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40">
              {generating ? "Generating..." : "Generate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {takingQuizId ? (
        <div className="fixed inset-0 z-[70] bg-bg/95 backdrop-blur-sm p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto rounded-[10px] border border-b1 bg-s1 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold">{quizDetailQuery.data?.quiz.title ?? "Quiz"}</h3>
              <button type="button" onClick={() => setTakingQuizId(null)} className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3">Close</button>
            </div>
            {quizResult ? (
              <div className="rounded-[10px] border border-b1 bg-s2/40 p-4">
                <p className="text-[16px] font-semibold">Score: {quizResult.score.toFixed(1)}%</p>
                <p className="text-[12px] text-tx2 mt-1">
                  {quizResult.correct}/{quizResult.total} correct · +{quizResult.xp_earned} XP
                </p>
              </div>
            ) : question ? (
              <div>
                <p className="text-[12px] text-tx3 font-mono mb-2">Q {currentQuestion + 1} of {questions.length}</p>
                <p className="text-[14px] text-tx mb-3">{question.question}</p>
                <div className="space-y-2">
                  {(["a", "b", "c", "d"] as const).map((key) => {
                    const value = question[`option_${key}` as keyof QuizQuestion] as string
                    const selected = answers[question.id] === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: key }))}
                        className={`w-full text-left rounded-[7px] border px-3 py-2 text-[12px] ${
                          selected ? "border-blue-500/40 bg-[var(--bd)] text-blue-200" : "border-b1 bg-s2 text-tx2 hover:bg-s3"
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3 flex justify-end">
                  {currentQuestion < questions.length - 1 ? (
                    <button type="button" onClick={() => setCurrentQuestion((v) => v + 1)} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600">
                      Next
                    </button>
                  ) : (
                    <button type="button" onClick={() => void submitQuiz()} className="h-8 px-3 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600">
                      Finish Quiz
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <LoadingSkeleton rows={4} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
