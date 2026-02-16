import type { QuizAppContextValue } from '@/context/quiz-app-context'
import { themes } from '@/data/themes'
import { hasRemote } from '@/services/supabase'
import type { AccessMode, AppConfig, Level, LevelRecord, ThemeOption } from '@/types/quiz'
import { supabase } from '@/utils/supabase'
import { buildPublicAppUrl } from '@/utils/url'
import type { Session } from '@supabase/supabase-js'
import { useMemo, useRef, useState } from 'react'

import { adminEmails, levelKey } from './quiz/shared'
import { useQuizActions } from './quiz/useQuizActions'
import {
  useAccessAndSharedQuery,
  useEnsureSelectedCategory,
  useObjectUrlCleanup,
  usePersistQuizDraft,
  useRemoteBootstrap,
  useResponderProfileSeed,
  useServiceWorkerRegistration,
  useSupabaseSession,
  useSyncRouteSelection,
} from './quiz/useQuizEffects'
import { screenVariants, useQuizRouting } from './quiz/useQuizRouting'
import { useQuizStoredState } from './quiz/useQuizStoredState'

export { screenVariants }

interface UseQuizAppControllerResult {
  contextValue: QuizAppContextValue
  routeKey: string
  centerMainContent: boolean
  canAccessMode: boolean
  requiresAuth: boolean
  authLoading: boolean
  hasSession: boolean
  isAdmin: boolean
  accessMode: AccessMode
  session: Session | null
  handleGoogleLogin: () => Promise<void>
  handleSignOut: () => Promise<void>
  activeTheme: ThemeOption
  frameImage: string | null
  headerTitle: string
  headerSubtitle: string
  selectedLevel: Level | null
  activeRecord: LevelRecord | null
  answers: Record<string, string>
  results: Record<string, boolean>
  uploadedImages: Record<string, string>
  isResponderMode: boolean
  isRankingPreviewMode: boolean
  config: AppConfig
  showSignOutButton: boolean
}

export const useQuizAppController = (): UseQuizAppControllerResult => {
  const remoteEnabled = hasRemote()
  const frameRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [session, setSession] = useState<Session | null>(null)

  const {
    location,
    pathState,
    routeKey,
    screen,
    goHome,
    goBuilder,
    goCategories,
    goLevels,
    goQuiz,
    goLevelResult,
    goFinal,
    goRanking,
    goMyQuizzes,
    goRespondResult,
  } = useQuizRouting()

  const {
    categories,
    setCategories,
    config,
    setConfig,
    records,
    setRecords,
    drafts,
    setDrafts,
    rankings,
    setRankings,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedLevelId,
    setSelectedLevelId,
    quizStartedAtMs,
    setQuizStartedAtMs,
    answers,
    setAnswers,
    results,
    setResults,
    corrected,
    setCorrected,
    frameImage,
    setFrameImage,
    uploadedImages,
    setUploadedImages,
    shareLinks,
    setShareLinks,
    shareQuizIds,
    setShareQuizIds,
    rankingPreviewLinks,
    setRankingPreviewLinks,
    shortLinks,
    setShortLinks,
    sharedQuiz,
    setSharedQuiz,
    rankingPreviewQuizId,
    setRankingPreviewQuizId,
    accessMode,
    setAccessMode,
    sharedResult,
    setSharedResult,
    responderName,
    setResponderName,
    responderAvatarDataUrl,
    setResponderAvatarDataUrl,
    responderAvatarFile,
    setResponderAvatarFile,
    authLoading,
    setAuthLoading,
    remoteBootstrappedRef,
  } = useQuizStoredState(remoteEnabled)

  const isResponderMode = Boolean(sharedQuiz)
  const isRankingPreviewMode = Boolean(rankingPreviewQuizId)
  const hasSession = Boolean(session)

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null
  const selectedLevel =
    selectedCategory?.levels.find((level) => level.id === selectedLevelId) ?? null
  const selectedLevelIndex =
    selectedCategory?.levels.findIndex((level) => level.id === selectedLevelId) ?? -1

  const activeLevel = sharedQuiz?.level ?? selectedLevel
  const activeTheme =
    themes.find((themeOption) => themeOption.id === (sharedQuiz?.themeId ?? config.themeId)) ??
    themes[0]
  const headerTitle = sharedQuiz?.title ?? config.title
  const headerSubtitle = sharedQuiz?.subtitle ?? config.subtitle

  const userEmail = session?.user.email?.toLowerCase() ?? ''
  const isAdmin = !remoteEnabled || adminEmails.length === 0 || adminEmails.includes(userEmail)

  const activeRecord = useMemo(() => {
    if (!selectedCategory || !selectedLevel) {
      return null
    }

    return records[levelKey(selectedCategory.id, selectedLevel.id)] ?? null
  }, [records, selectedCategory, selectedLevel])

  const categoryTotals = useMemo(() => {
    if (!selectedCategory) {
      return { score: 0, total: 0 }
    }

    return selectedCategory.levels.reduce(
      (accumulator, level) => {
        const record = records[levelKey(selectedCategory.id, level.id)]
        if (!record) {
          return accumulator
        }

        return {
          score: accumulator.score + record.score,
          total: accumulator.total + record.total,
        }
      },
      { score: 0, total: 0 },
    )
  }, [records, selectedCategory])

  useSyncRouteSelection({
    pathState,
    selectedCategoryId,
    selectedLevelId,
    setSelectedCategoryId,
    setSelectedLevelId,
  })

  useServiceWorkerRegistration()

  useSupabaseSession({
    remoteEnabled,
    setAuthLoading,
    setSession,
    supabaseSessionClient: supabase,
  })

  useRemoteBootstrap({
    remoteEnabled,
    remoteBootstrappedRef,
    session,
    isAdmin,
    categories,
    setCategories,
    setRankings,
  })

  useAccessAndSharedQuery({
    location,
    screen,
    remoteEnabled,
    session,
    isAdmin,
    setAccessMode,
    setRankings,
    setSharedQuiz,
    setRankingPreviewQuizId,
    setSelectedCategoryId,
    setSelectedLevelId,
    setQuizStartedAtMs,
    setAnswers,
    setResults,
    setCorrected,
    setResponderName,
    setResponderAvatarDataUrl,
    setResponderAvatarFile,
    goQuiz,
    goRanking,
  })

  useEnsureSelectedCategory({
    isResponderMode,
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
  })

  useResponderProfileSeed({
    isResponderMode,
    session,
    responderName,
    responderAvatarDataUrl,
    setResponderName,
    setResponderAvatarDataUrl,
  })

  usePersistQuizDraft({
    isResponderMode,
    screen,
    selectedCategory,
    selectedLevel,
    answers,
    results,
    corrected,
    setDrafts,
  })

  useObjectUrlCleanup({ frameImage, uploadedImages })

  const handleGoogleLogin = async () => {
    if (!supabase) {
      return
    }

    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildPublicAppUrl(currentPath),
      },
    })
  }

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
  }

  const {
    openLevel,
    handleCorrect,
    handleFinishLevel,
    handleNextAfterLevel,
    handlePlayAgain,
    handleBackgroundUpload,
    handleQuestionImageUpload,
    handleAddCategory,
    handleAddLevel,
    handleUpdateQuestion,
    handleGenerateShareLink,
    handleCopyShareLink,
    handleShareRankingPreview,
    handleShortenShareLink,
    handleBuildSubmissionLink,
    handleSubmitResponderResult,
    handleResponderAvatarUpload,
    updateAnswer,
  } = useQuizActions({
    categories,
    selectedCategory,
    selectedLevel,
    selectedLevelIndex,
    activeLevel,
    isResponderMode,
    corrected,
    quizStartedAtMs,
    answers,
    results,
    drafts,
    uploadedImages,
    shareLinks,
    shareQuizIds,
    rankingPreviewLinks,
    shortLinks,
    rankings,
    sharedQuiz,
    sharedResult,
    config,
    currentUserId: session?.user.id ?? null,
    responderName,
    responderAvatarDataUrl,
    responderAvatarFile,
    remoteEnabled,
    setCategories,
    setRecords,
    setDrafts,
    setSelectedCategoryId,
    setSelectedLevelId,
    setQuizStartedAtMs,
    setAnswers,
    setResults,
    setCorrected,
    setFrameImage,
    setUploadedImages,
    setShareLinks,
    setShareQuizIds,
    setRankingPreviewLinks,
    setShortLinks,
    setRankings,
    setSharedQuiz,
    setSharedResult,
    setResponderName,
    setResponderAvatarDataUrl,
    setResponderAvatarFile,
    goQuiz,
    goLevelResult,
    goFinal,
    goLevels,
    goRespondResult,
  })

  const finalPercent =
    categoryTotals.total > 0 ? Math.round((categoryTotals.score / categoryTotals.total) * 100) : 0
  const rankingEntries = rankingPreviewQuizId
    ? rankings.filter((entry) => entry.quizId === rankingPreviewQuizId)
    : rankings

  const canAccessMode =
    !remoteEnabled || (accessMode === 'admin' ? hasSession && isAdmin : hasSession)

  const contextValue: QuizAppContextValue = {
    frameRef,
    sheetRef,
    screen,
    categories,
    config,
    records,
    shareLinks,
    rankingPreviewLinks,
    shortLinks,
    answers,
    results,
    corrected,
    uploadedImages,
    responderName,
    responderAvatarDataUrl,
    selectedCategoryId,
    selectedLevelId,
    selectedCategory,
    selectedLevel,
    selectedLevelIndex,
    activeLevel,
    activeTheme,
    sharedQuiz,
    sharedResult,
    categoryTotals,
    finalPercent,
    activeRecord,
    rankingEntries,
    isResponderMode,
    isRankingPreviewMode,
    requiresAuth: remoteEnabled,
    authLoading,
    hasSession,
    isAdmin,
    canAccessMode,
    accessMode,
    session,
    setConfig,
    setSelectedCategoryId,
    setSelectedLevelId,
    setResponderName,
    setRankings,
    setSharedQuiz,
    goHome,
    goBuilder,
    goCategories,
    goRanking,
    goMyQuizzes,
    goLevels,
    openLevel,
    handleCorrect,
    handleFinishLevel,
    handleNextAfterLevel,
    handlePlayAgain,
    handleBackgroundUpload,
    handleQuestionImageUpload,
    handleAddCategory,
    handleAddLevel,
    handleUpdateQuestion,
    handleGenerateShareLink,
    handleCopyShareLink,
    handleShareRankingPreview,
    handleShortenShareLink,
    handleBuildSubmissionLink,
    handleSubmitResponderResult,
    handleResponderAvatarUpload,
    handleGoogleLogin,
    handleSignOut,
    updateAnswer,
  }

  return {
    contextValue,
    routeKey,
    centerMainContent: isResponderMode || isRankingPreviewMode,
    canAccessMode,
    requiresAuth: remoteEnabled,
    authLoading,
    hasSession,
    isAdmin,
    accessMode,
    session,
    handleGoogleLogin,
    handleSignOut,
    activeTheme,
    frameImage,
    headerTitle,
    headerSubtitle,
    selectedLevel,
    activeRecord,
    answers,
    results,
    uploadedImages,
    isResponderMode,
    isRankingPreviewMode,
    config,
    showSignOutButton:
      remoteEnabled && hasSession && canAccessMode && !isResponderMode && !isRankingPreviewMode,
  }
}
