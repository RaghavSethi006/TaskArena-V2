import { BookOpen, Brain, ChevronDown, ChevronUp, FileText, FlaskConical, Plus, ScrollText, Trash2 } from "lucide-react"
import { useState } from "react"
import { getBaseApiUrl } from "@/api/client"
import EmptyState from "@/components/shared/EmptyState"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFiles, useFolders } from "@/hooks/useNotes"
import {
  useDeleteQuiz,
  useDeleteStudyMaterial,
  useQuizAttempts,
  useQuizDetail,
  useQuizzes,
  useStudyHubCourses,
  useStudyMaterials,
  useSubmitAttempt,
} from "@/hooks/useStudyHub"
import type {
  Course,
  FormulaSheetContent,
  PracticeExamContent,
  QAContent,
  QuizQuestion,
  StudyMaterial,
  StudyMaterialType,
  StudyNotesContent,
} from "@/types"
import { toast } from "sonner"

type MaterialTab = "quizzes" | "study_notes" | "formula_sheet" | "qa" | "practice_exam"
type ScopeMode = "course" | "folder" | "file"

const TAB_OPTIONS: Array<{ key: MaterialTab; label: string; icon: React.ReactNode }> = [
  { key: "quizzes",       label: "Quizzes",        icon: <ScrollText className="w-3.5 h-3.5" /> },
  { key: "study_notes",   label: "Study Notes",    icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: "formula_sheet", label: "Formula Sheet",  icon: <FlaskConical className="w-3.5 h-3.5" /> },
  { key: "qa",            label: "Q&A",            icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "practice_exam", label: "Practice Exam",  icon: <Brain className="w-3.5 h-3.5" /> },
]

const MATERIAL_LABELS: Record<StudyMaterialType, string> = {
  study_notes:   "Study Notes",
  formula_sheet: "Formula Sheet",
  qa:            "Q&A",
  practice_exam: "Practice Exam",
}

function formatAttemptTime(timestamp: string) {
  return new Date(timestamp).toLocaleString()
}

function StudyNotesViewer({ material }: { material: StudyMaterial }) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const content = material.content as StudyNotesContent
  return (
    <div className="space-y-2">
      {(content.sections ?? []).map((section, idx) => (
        <div key={idx} className="rounded-[8px] border border-b1 bg-s2/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-[13px] font-semibold text-tx">{section.heading}</span>
            {expanded === idx
              ? <ChevronUp className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />}
          </button>
          {expanded === idx && (
            <ul className="px-4 pb-3 space-y-1">
              {(section.bullets ?? []).map((bullet, bi) => (
                <li key={bi} className="flex items-start gap-2 text-[12px] text-tx2">
                  <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
function FormulaSheetViewer({ material }: { material: StudyMaterial }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const content = material.content as FormulaSheetContent
  return (
    <div className="space-y-2">
      {(content.entries ?? []).map((entry, idx) => (
        <div key={idx} className="rounded-[8px] border border-b1 bg-s2/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[12px] font-bold font-mono text-violet-300 flex-shrink-0">{entry.name}</span>
              <span className="text-[12px] font-mono text-amber-300 truncate">{entry.formula}</span>
            </div>
            {expanded === idx
              ? <ChevronUp className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-tx3 flex-shrink-0" />}
          </button>
          {expanded === idx && (
            <div className="px-3 pb-3 space-y-2 border-t border-b1 pt-2">
              <p className="text-[12px] text-tx2">{entry.explanation}</p>
              {(entry.variables ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.variables.map((v, vi) => (
                    <span key={vi} className="text-[10px] font-mono px-2 py-0.5 rounded-[5px] bg-s1 border border-b1 text-tx2">
                      <span className="text-amber-300">{v.symbol}</span> = {v.meaning}
                    </span>
                  ))}
                </div>
              )}
              {entry.example && (
                <div className="rounded-[6px] bg-s1 border border-b1 px-2 py-1.5">
                  <p className="text-[10px] text-tx3 font-mono uppercase tracking-wide mb-0.5">Example</p>
                  <p className="text-[11px] text-tx2">{entry.example}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function QAViewer({ material }: { material: StudyMaterial }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [showLong, setShowLong] = useState<Set<number>>(new Set())
  const content = material.content as QAContent
  return (
    <div className="space-y-3">
      {(content.items ?? []).map((item, idx) => {
        const isRevealed = revealed.has(idx)
        const isLong = showLong.has(idx)
        return (
          <div key={idx} className="rounded-[8px] border border-b1 bg-s2/30 p-3">
            <p className="text-[13px] text-tx font-semibold mb-2">
              <span className="text-tx3 font-mono mr-1">Q{idx + 1}.</span> {item.question}
            </p>
            {(item.hints ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.hints.map((hint, hi) => (
                  <span key={hi} className="text-[10px] px-2 py-0.5 rounded-[5px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    💡 {hint}
                  </span>
                ))}
              </div>
            )}
            {!isRevealed ? (
              <button
                type="button"
                onClick={() => setRevealed((prev) => new Set([...prev, idx]))}
                className="h-7 px-3 rounded-[7px] border border-b1 bg-s1 text-[11px] text-tx2 hover:bg-s2"
              >
                Reveal Answer
              </button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-[7px] bg-s1 border border-emerald-500/20 px-3 py-2">
                  <p className="text-[10px] text-emerald-400 font-mono uppercase mb-1">Short Answer</p>
                  <p className="text-[12px] text-tx2">{item.short_answer}</p>
                </div>
                {!isLong ? (
                  <button
                    type="button"
                    onClick={() => setShowLong((prev) => new Set([...prev, idx]))}
                    className="h-7 px-3 rounded-[7px] border border-b1 bg-s1 text-[11px] text-blue-300 hover:bg-s2"
                  >
                    Show Detailed Answer ▼
                  </button>
                ) : (
                  <div className="rounded-[7px] bg-s1 border border-blue-500/20 px-3 py-2">
                    <p className="text-[10px] text-blue-400 font-mono uppercase mb-1">Detailed Answer</p>
                    <p className="text-[12px] text-tx2 leading-relaxed">{item.long_answer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PracticeExamViewer({ material }: { material: StudyMaterial }) {
  const [revealedQ, setRevealedQ] = useState<Set<string>>(new Set())
  const content = material.content as PracticeExamContent
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="rounded-[7px] bg-s2/60 border border-b1 px-3 py-2 text-center">
          <p className="text-[10px] text-tx3 font-mono uppercase">Duration</p>
          <p className="text-[14px] font-bold font-mono text-tx">{content.duration_minutes ?? "?"}m</p>
        </div>
        <div className="rounded-[7px] bg-s2/60 border border-b1 px-3 py-2 text-center">
          <p className="text-[10px] text-tx3 font-mono uppercase">Total Marks</p>
          <p className="text-[14px] font-bold font-mono text-tx">{content.total_marks ?? "?"}</p>
        </div>
        <div className="rounded-[7px] bg-s2/60 border border-b1 px-3 py-2 text-center">
          <p className="text-[10px] text-tx3 font-mono uppercase">Sections</p>
          <p className="text-[14px] font-bold font-mono text-tx">{(content.sections ?? []).length}</p>
        </div>
      </div>

      {(content.sections ?? []).map((section, si) => (
        <div key={si} className="rounded-[10px] border border-b1 bg-s1 overflow-hidden">
          <div className="px-3 py-2 border-b border-b1 bg-s2/40">
            <p className="text-[13px] font-semibold text-tx">{section.name}</p>
          </div>
          <div className="p-3 space-y-3">
            {(section.questions ?? []).map((q, qi) => {
              const qKey = `${si}-${qi}`
              const isRevealed = revealedQ.has(qKey)
              return (
                <div key={qi} className="rounded-[8px] border border-b1 bg-s2/30 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[13px] text-tx leading-snug">
                      <span className="font-mono text-tx3 mr-1">Q{q.number}.</span> {q.question}
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-s1 border border-b1 text-tx3 flex-shrink-0">
                      {q.marks} mk{q.marks !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {!isRevealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealedQ((prev) => new Set([...prev, qKey]))}
                      className="h-7 px-3 rounded-[7px] border border-b1 bg-s1 text-[11px] text-tx2 hover:bg-s2"
                    >
                      Show Model Answer
                    </button>
                  ) : (
                    <div className="rounded-[7px] bg-s1 border border-emerald-500/20 px-3 py-2">
                      <p className="text-[10px] text-emerald-400 font-mono uppercase mb-1">Model Answer</p>
                      <p className="text-[12px] text-tx2 leading-relaxed">{q.model_answer}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MaterialCard({
  material,
  onView,
  onDelete,
}: {
  material: StudyMaterial
  onView: () => void
  onDelete: () => void
}) {
  const itemCount =
    material.type === "study_notes"
      ? (material.content as StudyNotesContent).sections?.length ?? 0
      : material.type === "formula_sheet"
        ? (material.content as FormulaSheetContent).entries?.length ?? 0
        : material.type === "qa"
          ? (material.content as QAContent).items?.length ?? 0
          : (material.content as PracticeExamContent).sections?.reduce(
              (acc, s) => acc + (s.questions?.length ?? 0),
              0
            ) ?? 0

  const countLabel =
    material.type === "study_notes"   ? "sections"
    : material.type === "formula_sheet" ? "entries"
    : material.type === "qa"            ? "Q&A pairs"
    : "questions"

  return (
    <div className="rounded-[12px] border border-b1 bg-s1 overflow-hidden hover:border-b2 transition-colors">
      <div className="h-1 bg-violet-500" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-tx truncate">{material.title}</h3>
            <p className="text-[10px] text-tx3 font-mono mt-0.5">
              {itemCount} {countLabel} · {new Date(material.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="text-tx3 hover:text-rose-300 transition-colors flex-shrink-0"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onView}
          className="h-8 w-full rounded-[7px] bg-violet-500 text-white text-[12px] hover:bg-violet-600 transition-colors flex items-center justify-center gap-1.5"
        >
          Open
        </button>
      </div>
    </div>
  )
}
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
  const [nItems, setNItems] = useState(10)
  const [genSteps, setGenSteps] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [historyQuizId, setHistoryQuizId] = useState<number | null>(null)
  const [takingQuizId, setTakingQuizId] = useState<number | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [quizResult, setQuizResult] = useState<{
    score: number; correct: number; total: number; xp_earned: number
    results: Array<{ question_id: number; correct: boolean; chosen: string; answer: string; explanation: string }>
  } | null>(null)
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null)

  const coursesQuery = useStudyHubCourses()
  const quizzesQuery = useQuizzes(selectedCourse?.id ?? null)
  const deleteQuiz = useDeleteQuiz()
  const quizDetailQuery = useQuizDetail(takingQuizId)
  const quizAttemptsQuery = useQuizAttempts(takingQuizId)
  const historyAttemptsQuery = useQuizAttempts(historyQuizId)
  const submitAttempt = useSubmitAttempt()
  const foldersQuery = useFolders(selectedCourse?.id ?? null)
  const filesQuery = useFiles(
    scope === "file" && folderId ? Number(folderId) : scope === "folder" && folderId ? Number(folderId) : null
  )
  const materialsQuery = useStudyMaterials(
    selectedCourse?.id ?? null,
    activeTab !== "quizzes" ? (activeTab as StudyMaterialType) : null
  )
  const deleteStudyMaterial = useDeleteStudyMaterial()

  const startQuiz = (quizId: number) => {
    setTakingQuizId(quizId)
    setCurrentQuestion(0)
    setAnswers({})
    setQuizResult(null)
  }

  const submitQuiz = async () => {
    if (!takingQuizId) return
    const result = await submitAttempt.mutateAsync({ quizId: takingQuizId, answers, timeTaken: 0 })
    await quizAttemptsQuery.refetch()
    await quizzesQuery.refetch()
    setQuizResult({
      score: result.score, correct: result.correct, total: result.total,
      xp_earned: result.xp_earned, results: result.results ?? [],
    })
    toast.success(`Quiz complete! +${result.xp_earned} XP`)
  }

  const runGeneration = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    setGenSteps([])

    const isQuiz = activeTab === "quizzes"

    try {
      const baseApiUrl = await getBaseApiUrl()
      const endpoint = isQuiz ? "/quizzes/generate" : "/study-materials/generate"
      const body = isQuiz
        ? {
            course_id: selectedCourse.id,
            folder_id: scope !== "course" ? Number(folderId || 0) || null : null,
            file_id: scope === "file" ? Number(fileId || 0) || null : null,
            n_questions: nQuestions,
            difficulty,
            provider,
          }
        : {
            course_id: selectedCourse.id,
            type: activeTab,
            folder_id: scope !== "course" ? Number(folderId || 0) || null : null,
            file_id: scope === "file" ? Number(fileId || 0) || null : null,
            n_items: nItems,
            difficulty,
            provider,
          }

      const response = await fetch(`${baseApiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
            step?: string; progress?: number; total?: number; done?: boolean; error?: string
          }
          if (data.step) setGenSteps((prev) => [...prev, `${data.step} (${data.progress}/${data.total})`])
          if (data.done) {
            toast.success(`${isQuiz ? "Quiz" : MATERIAL_LABELS[activeTab as StudyMaterialType]} generated`)
            if (isQuiz) await quizzesQuery.refetch()
            else await materialsQuery.refetch()
            setGenerateOpen(false)
          }
          if (data.error) toast.error(data.error)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  if (coursesQuery.isLoading) return <LoadingSkeleton rows={8} />

  if (viewingMaterial) {
    return (
      <div className="animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold">{viewingMaterial.title}</h2>
            <p className="text-[12px] text-tx3 font-mono mt-0.5">
              {MATERIAL_LABELS[viewingMaterial.type]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewingMaterial(null)}
            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
          >
            ← Back to Hub
          </button>
        </div>
        {viewingMaterial.type === "study_notes"   && <StudyNotesViewer   material={viewingMaterial} />}
        {viewingMaterial.type === "formula_sheet" && <FormulaSheetViewer material={viewingMaterial} />}
        {viewingMaterial.type === "qa"            && <QAViewer           material={viewingMaterial} />}
        {viewingMaterial.type === "practice_exam" && <PracticeExamViewer material={viewingMaterial} />}
      </div>
    )
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
                    <p className="text-[15px] font-bold text-tx font-mono">{course.notes_count ?? 0}</p>
                    <p className="text-[9px] text-tx3 uppercase tracking-wide mt-0.5">Notes</p>
                  </div>
                  <div className="rounded-[7px] bg-s2/60 border border-b1 p-2 text-center">
                    <p className="text-[15px] font-bold text-tx font-mono">{course.sheets_count ?? 0}</p>
                    <p className="text-[9px] text-tx3 uppercase tracking-wide mt-0.5">Sheets</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-tx3 font-mono">Tap to browse materials →</p>
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

              <div className="rounded-[12px] border border-b1 bg-s1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-tx">Attempt History</p>
                    <p className="text-[11px] text-tx3">Newest attempts are shown first.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistoryQuizId(takingQuizId)}
                    className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
                  >
                    Open Full History
                  </button>
                </div>
                {(quizAttemptsQuery.data ?? []).length === 0 ? (
                  <p className="mt-3 text-[12px] text-tx3">No attempts saved yet.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {(quizAttemptsQuery.data ?? []).slice(0, 3).map((attempt, idx) => (
                      <div key={attempt.id} className="rounded-[8px] border border-b1 bg-s2/50 px-3 py-2 text-[12px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-tx">Attempt {idx + 1}</span>
                          <span className="font-mono text-blue-300">
                            {attempt.score !== null ? `${attempt.score.toFixed(0)}%` : "-"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-[10px] font-mono text-tx3">
                          <span>{formatAttemptTime(attempt.taken_at)}</span>
                          <span>{attempt.time_taken ?? 0}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          {r.correct ? "âœ“ Correct" : "âœ— Wrong"}
                        </span>
                        <p className="text-[13px] text-tx leading-snug">
                          Q{idx + 1}. {q.question}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {!r.correct ? (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[5px] bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            You chose: {chosenLetter}. {q[`option_${r.chosen}` as keyof typeof q] as string || "â€”"}
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
              onClick={() => { setGenerateOpen(true); setGenSteps([]) }}
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
            className={`h-8 px-3 rounded-[7px] border text-[12px] inline-flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-[var(--bd)] border-blue-500/30 text-blue-300"
                : "bg-s2 border-b1 text-tx2 hover:bg-s3"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "quizzes" && (
        (quizzesQuery.data ?? []).length === 0
          ? <EmptyState title="No quizzes yet" description="Generate your first quiz from this course." />
          : (
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

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startQuiz(quiz.id)}
                          className="h-8 flex-1 rounded-[7px] bg-blue-500 text-white text-[12px] hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ScrollText className="w-3.5 h-3.5" />
                          {quiz.attempt_count > 0 ? "Retake Quiz" : "Start Quiz"}
                        </button>
                        {quiz.attempt_count > 0 ? (
                          <button
                            type="button"
                            onClick={() => setHistoryQuizId(quiz.id)}
                            className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-[12px] text-tx2 hover:bg-s3"
                          >
                            History
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
      )}

      {activeTab !== "quizzes" && (
        materialsQuery.isLoading
          ? <LoadingSkeleton rows={6} />
          : (materialsQuery.data ?? []).length === 0
            ? (
              <EmptyState
                title={`No ${MATERIAL_LABELS[activeTab as StudyMaterialType]} yet`}
                description="Click Generate to create one from your indexed course content."
              />
            )
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {(materialsQuery.data ?? []).map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onView={() => setViewingMaterial(material)}
                    onDelete={async () => {
                      if (!window.confirm("Delete this material?")) return
                      await deleteStudyMaterial.mutateAsync(material.id)
                      toast.success("Deleted")
                    }}
                  />
                ))}
              </div>
            )
      )}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>
              Generate {activeTab === "quizzes" ? "Quiz" : MATERIAL_LABELS[activeTab as StudyMaterialType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Scope */}
            <div>
              <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">Scope</p>
              <div className="flex gap-2">
                {(["course", "folder", "file"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`h-7 px-2 rounded-[7px] text-[11px] ${scope === s ? "bg-blue-500 text-white" : "bg-s2 border border-b1 text-tx2"}`}
                  >
                    {s === "course" ? "Whole course" : s === "folder" ? "Specific folder" : "Specific file"}
                  </button>
                ))}
              </div>
            </div>

            {(scope === "folder" || scope === "file") && (
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="">Select folder</option>
                {(foldersQuery.data ?? []).map((folder) => (
                  <option key={folder.id} value={String(folder.id)}>{folder.name}</option>
                ))}
              </select>
            )}

            {scope === "file" && (
              <select
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="">Select file</option>
                {(filesQuery.data ?? []).map((file) => (
                  <option key={file.id} value={String(file.id)}>{file.name}</option>
                ))}
              </select>
            )}

            {/* Provider — always shown */}
            <div>
              <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">AI Provider</p>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "groq" | "local" | "ollama")}
                className="h-9 w-full rounded-[7px] border border-b1 bg-s2 px-2 text-[12px] text-tx"
              >
                <option value="groq">Groq</option>
                <option value="local">Local</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>

            {/* Difficulty — only for quiz, Q&A, practice exam */}
            {(activeTab === "quizzes" || activeTab === "qa" || activeTab === "practice_exam") && (
              <div>
                <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">Difficulty</p>
                <div className="flex gap-2">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`h-7 flex-1 rounded-[7px] text-[11px] capitalize ${
                        difficulty === d
                          ? d === "easy"
                            ? "bg-emerald-500 text-white"
                            : d === "medium"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          : "bg-s2 border border-b1 text-tx2"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Count — label and range varies per type */}
            <div>
              <p className="text-[11px] text-tx3 font-mono uppercase tracking-wide mb-1.5">
                {activeTab === "quizzes" ? "Number of Questions"
                  : activeTab === "study_notes" ? "Number of Sections"
                  : activeTab === "formula_sheet" ? "Number of Entries"
                  : activeTab === "qa" ? "Number of Q&A Pairs"
                  : "Number of Questions"}
              </p>
              <div className="flex items-center gap-3">
                <input
                  value={String(activeTab === "quizzes" ? nQuestions : nItems)}
                  onChange={(e) => {
                    const val = Number(e.target.value || 0)
                    if (activeTab === "quizzes") setNQuestions(val)
                    else setNItems(val)
                  }}
                  type="range"
                  min={activeTab === "study_notes" ? 3 : 5}
                  max={activeTab === "study_notes" ? 15 : activeTab === "formula_sheet" ? 30 : 25}
                  step={1}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-[14px] font-bold font-mono text-tx w-6 text-right">
                  {activeTab === "quizzes" ? nQuestions : nItems}
                </span>
              </div>

              {/* Per-type description */}
              <p className="text-[10px] text-tx3 mt-1">
                {activeTab === "quizzes"
                  ? "Multiple-choice questions graded automatically."
                  : activeTab === "study_notes"
                    ? "Each section contains 3–6 key bullet points. No difficulty level — notes aim for comprehensive coverage."
                    : activeTab === "formula_sheet"
                      ? "Each entry includes the formula, explanation, variables, and a worked example. No difficulty level — formulas are objective."
                      : activeTab === "qa"
                        ? "Open-ended questions with a short answer and a detailed model answer."
                        : "Questions spread across 2–3 sections with marks and model answers."}
              </p>
            </div>

            {/* Generation log */}
            {genSteps.length > 0 && (
              <div className="rounded-[7px] border border-b1 bg-s2/40 p-2 max-h-[100px] overflow-y-auto">
                {genSteps.map((step, idx) => (
                  <p key={`${step}-${idx}`} className="text-[11px] text-tx2 font-mono">{step}</p>
                ))}
              </div>
            )}
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

      <Dialog open={historyQuizId !== null} onOpenChange={(open) => !open && setHistoryQuizId(null)}>
        <DialogContent className="bg-s1 border-b1 rounded-[12px]">
          <DialogHeader>
            <DialogTitle>Quiz Attempt History</DialogTitle>
          </DialogHeader>
          {(historyAttemptsQuery.data ?? []).length === 0 ? (
            <EmptyState title="No attempts yet" description="Complete this quiz once to populate history." />
          ) : (
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {(historyAttemptsQuery.data ?? []).map((attempt, idx) => (
                <div key={attempt.id} className="rounded-[8px] border border-b1 bg-s2/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] text-tx">Attempt {idx + 1}</p>
                      <p className="text-[10px] font-mono text-tx3">{formatAttemptTime(attempt.taken_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold font-mono text-blue-300">
                        {attempt.score !== null ? `${attempt.score.toFixed(0)}%` : "-"}
                      </p>
                      <p className="text-[10px] font-mono text-tx3">{attempt.time_taken ?? 0}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setHistoryQuizId(null)}
              className="h-8 px-3 rounded-[7px] border border-b1 bg-s2 text-tx2 hover:bg-s3"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
