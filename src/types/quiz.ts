export type Screen =
  | 'home'
  | 'builder'
  | 'categories'
  | 'levels'
  | 'play'
  | 'quiz'
  | 'levelResult'
  | 'final'
  | 'ranking'
  | 'myQuizzes'
  | 'respondResult'

export type AccessMode = 'admin' | 'responder' | 'ranking'

export type ThemeId = 'neon-purple' | 'candy-pink' | 'ice-blue' | 'soft-bw'
export type LevelMode = 'quiz' | 'blank'
export type TimingMode = 'timeless' | 'speedrun'
export type AnswerMode = 'text' | 'choices'

export interface Question {
  id: string
  question: string
  prompt: string
  imagePath: string
  options: string[]
  correctIndex: number
  acceptedAnswers: string[]
  correctAnswerDisplay: string
}

export interface Level {
  id: string
  title: string
  description: string
  mode?: LevelMode
  timingMode?: TimingMode
  answerMode?: AnswerMode
  isPublished?: boolean
  questions: Question[]
}

export interface Category {
  id: string
  title: string
  subtitle: string
  description: string
  coverImage: string
  levels: Level[]
}

export interface ThemeOption {
  id: ThemeId
  label: string
  gradientFrom: string
  gradientVia: string
  gradientTo: string
  headerColor: string
  cardColor: string
  cardBorder: string
  accentColor: string
  patternDot: string
  textColor: string
}

export interface LevelRecord {
  categoryId: string
  levelId: string
  score: number
  total: number
  points?: number
  durationMs?: number
  playMode?: TimingMode
  answers: Record<string, string>
  results: Record<string, boolean>
  completedAt: string
}

export interface AppConfig {
  title: string
  subtitle: string
  themeId: ThemeId
}

export interface LevelDraft {
  answers: Record<string, string>
  results: Record<string, boolean>
  corrected: boolean
}

export interface ResponderResult {
  score: number
  total: number
  points: number
  durationMs: number
  playMode: TimingMode
  attemptId: string
}

export interface ShareQuizPayload {
  version: 1
  quizId: string
  categoryId: string
  categoryTitle: string
  levelId: string
  title: string
  subtitle: string
  themeId: ThemeId
  level: Level
}

export interface ShareSubmissionPayload {
  version: 1
  submissionId: string
  quizId: string
  categoryId?: string
  levelId?: string
  userId?: string | null
  responderName: string
  responderAvatarDataUrl: string | null
  categoryTitle: string
  levelTitle: string
  score: number
  total: number
  points?: number
  durationMs?: number
  playMode?: TimingMode
  answers: Record<string, string>
  results: Record<string, boolean>
  submittedAt: string
}

export interface RankingEntry extends ShareSubmissionPayload {}
