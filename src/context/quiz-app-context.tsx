import type { Session } from '@supabase/supabase-js'
import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from 'react'
import { createContext, useContext } from 'react'

import type {
  AccessMode,
  AppConfig,
  Category,
  Level,
  LevelMode,
  LevelRecord,
  RankingEntry,
  ResponderResult,
  ShareQuizPayload,
  ThemeOption,
  TimingMode,
} from '@/types/quiz'

export interface QuizAppContextValue {
  frameRef: RefObject<HTMLDivElement>
  sheetRef: RefObject<HTMLDivElement>
  screen: string
  categories: Category[]
  config: AppConfig
  records: Record<string, LevelRecord>
  shareLinks: Record<string, string>
  rankingPreviewLinks: Record<string, string>
  shortLinks: Record<string, string>
  answers: Record<string, string>
  results: Record<string, boolean>
  corrected: boolean
  uploadedImages: Record<string, string>
  responderName: string
  responderAvatarDataUrl: string | null
  selectedCategoryId: string
  selectedLevelId: string
  selectedCategory: Category | null
  selectedLevel: Level | null
  selectedLevelIndex: number
  activeLevel: Level | null
  activeTheme: ThemeOption
  sharedQuiz: ShareQuizPayload | null
  sharedResult: ResponderResult | null
  categoryTotals: { score: number; total: number }
  finalPercent: number
  activeRecord: LevelRecord | null
  rankingEntries: RankingEntry[]
  isResponderMode: boolean
  isRankingPreviewMode: boolean
  requiresAuth: boolean
  authLoading: boolean
  hasSession: boolean
  isAdmin: boolean
  canAccessMode: boolean
  accessMode: AccessMode
  session: Session | null
  setConfig: Dispatch<SetStateAction<AppConfig>>
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
  setSelectedLevelId: Dispatch<SetStateAction<string>>
  setResponderName: Dispatch<SetStateAction<string>>
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
  setSharedQuiz: Dispatch<SetStateAction<ShareQuizPayload | null>>
  goHome: () => void
  goBuilder: () => void
  goCategories: () => void
  goRanking: () => void
  goMyQuizzes: () => void
  goLevels: (categoryId: string) => void
  openLevel: (categoryId: string, levelId: string) => void
  handleCorrect: () => void
  handleFinishLevel: () => void
  handleNextAfterLevel: () => void
  handlePlayAgain: () => void
  handleBackgroundUpload: (event: ChangeEvent<HTMLInputElement>) => void
  handleQuestionImageUpload: (
    questionId: string,
    file: File,
    options?: { categoryId: string; levelId: string },
  ) => Promise<void>
  handleAddCategory: (category: Category) => Promise<void>
  handleAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
  ) => void
  handleUpdateQuestion: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => Promise<void>
  handleGenerateShareLink: (levelId: string) => Promise<void>
  handleCopyShareLink: (levelId: string) => Promise<void>
  handleShareRankingPreview: (levelId: string) => Promise<void>
  handleShortenShareLink: (levelId: string) => Promise<void>
  handleBuildSubmissionLink: () => Promise<string>
  handleSubmitResponderResult: () => Promise<boolean>
  handleResponderAvatarUpload: (file: File) => Promise<void>
  handleGoogleLogin: () => Promise<void>
  handleSignOut: () => Promise<void>
  updateAnswer: (questionId: string, value: string) => void
}

const QuizAppContext = createContext<QuizAppContextValue | null>(null)

export const QuizAppProvider = QuizAppContext.Provider

export const useQuizApp = (): QuizAppContextValue => {
  const context = useContext(QuizAppContext)

  if (!context) {
    throw new Error('useQuizApp must be used inside QuizAppProvider')
  }

  return context
}
