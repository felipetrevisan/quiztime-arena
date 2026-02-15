export type Screen =
  | 'home'
  | 'categories'
  | 'levels'
  | 'quiz'
  | 'levelResult'
  | 'final'
  | 'ranking'
  | 'respondResult'

export type ThemeId = 'neon-purple' | 'candy-pink' | 'ice-blue' | 'soft-bw'
export type LevelMode = 'quiz' | 'blank'

export interface Question {
  id: string
  prompt: string
  imagePath: string
  acceptedAnswers: string[]
  correctAnswerDisplay: string
}

export interface Level {
  id: string
  title: string
  description: string
  mode?: LevelMode
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
  responderName: string
  responderAvatarDataUrl: string | null
  categoryTitle: string
  levelTitle: string
  score: number
  total: number
  answers: Record<string, string>
  results: Record<string, boolean>
  submittedAt: string
}

export interface RankingEntry extends ShareSubmissionPayload {}
