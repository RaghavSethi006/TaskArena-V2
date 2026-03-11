// Users
export interface User {
  id: number
  name: string
  email: string | null
  level: number
  xp: number
  streak: number
  last_active: string | null
  created_at: string
}

// Tasks
export interface Task {
  id: number
  title: string
  subject: string | null
  type: "assignment" | "study" | "productivity"
  status: "pending" | "completed"
  deadline: string | null
  points: number
  course_id: number | null
  created_at: string
  completed_at: string | null
}

export interface TaskCreate {
  title: string
  type: "assignment" | "study" | "productivity"
  subject?: string
  deadline?: string
  points?: number
  course_id?: number
}

// Courses / Notes
export interface Course {
  id: number
  name: string
  code: string | null
  color: string
  user_id: number
  created_at: string
  folder_count?: number
  file_count?: number
  quiz_count?: number
  notes_count?: number
  sheets_count?: number
}

export interface Folder {
  id: number
  course_id: number
  name: string
  order_index: number
}

export interface File {
  id: number
  folder_id: number
  name: string
  path: string
  original_path: string | null
  size: number | null
  indexed: boolean
  indexed_at: string | null
  chunk_count: number
}

// Chat
export interface Conversation {
  id: number
  title: string | null
  context_course_id: number | null
  context_folder_id: number | null
  context_file_id: number | null
  created_at: string
  updated_at: string
  message_count: number
}

export interface Message {
  id: number
  conversation_id: number
  role: "user" | "assistant"
  content: string
  sources: string[]
  model_used: string | null
  created_at: string
}

// Schedule
export interface ScheduleEvent {
  id: number
  title: string
  type: "study" | "assignment" | "exam" | "break" | "other"
  course_id: number | null
  date: string
  start_time: string | null
  duration: number | null
  notes: string | null
  ai_suggested: boolean
  created_at: string
}

// Quiz
export interface Quiz {
  id: number
  title: string
  course_id: number
  difficulty: "easy" | "medium" | "hard"
  created_at: string
  question_count: number
  best_score: number | null
  attempt_count: number
}

export interface QuizAttempt {
  id: number
  quiz_id: number
  user_id: number
  score: number | null
  answers: Record<string, string>
  time_taken: number | null
  taken_at: string
}

export interface QuizQuestion {
  id: number
  quiz_id: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct: "a" | "b" | "c" | "d"
  explanation: string | null
  order_index: number | null
}

// Stats
export interface OverviewStats {
  tasks_completed: number
  tasks_pending: number
  tasks_total: number
  completion_rate: number
  total_xp: number
  current_streak: number
  quizzes_taken: number
  avg_quiz_score: number | null
  best_quiz_score: number | null
  rank: number
  level: number
  xp_this_week: number
  tasks_this_week: number
}

// Leaderboard
export interface RankingEntry {
  rank: number
  user_id: number
  name: string
  level: number
  xp: number
  tasks_completed: number
  streak: number
  weekly_xp: number
}

// AI config
export interface AIConfig {
  provider: string
  model: string
  groq_key_set: boolean
  local_model_exists: boolean
  ollama_available: boolean
  ollama_url: string
}

export type StudyMaterialType = "study_notes" | "formula_sheet" | "qa" | "practice_exam"

export interface StudyNotesContent {
  title: string
  sections: { heading: string; bullets: string[] }[]
}

export interface FormulaSheetContent {
  title: string
  entries: {
    name: string
    formula: string
    explanation: string
    variables: { symbol: string; meaning: string }[]
    example: string
  }[]
}

export interface QAContent {
  title: string
  items: {
    question: string
    short_answer: string
    long_answer: string
    hints: string[]
  }[]
}

export interface PracticeExamContent {
  title: string
  duration_minutes: number
  total_marks: number
  sections: {
    name: string
    questions: {
      number: number
      question: string
      marks: number
      model_answer: string
    }[]
  }[]
}

export interface StudyMaterial {
  id: number
  course_id: number
  folder_id: number | null
  file_id: number | null
  type: StudyMaterialType
  title: string
  content: StudyNotesContent | FormulaSheetContent | QAContent | PracticeExamContent
  created_at: string
}
