import type { Dispatch, SetStateAction } from 'react'

import type {
  Category,
  Level,
  LevelDraft,
  LevelRecord,
  ResponderResult,
  ShareQuizPayload,
  TimingMode,
} from '@/types/quiz'
import { isAnswerCorrect } from '@/utils/normalize'
import { calculateSpeedrunPoints } from '@/utils/scoring'

import { levelKey, removeCategoryKeys } from '../shared'
import { revokeBlobUrls } from './shared'

interface UseGameplayActionsParams {
  categories: Category[]
  selectedCategory: Category | null
  selectedLevel: Level | null
  selectedLevelIndex: number
  activeLevel: Level | null
  isResponderMode: boolean
  corrected: boolean
  quizStartedAtMs: number
  answers: Record<string, string>
  results: Record<string, boolean>
  drafts: Record<string, LevelDraft>
  uploadedImages: Record<string, string>
  setRecords: Dispatch<SetStateAction<Record<string, LevelRecord>>>
  setDrafts: Dispatch<SetStateAction<Record<string, LevelDraft>>>
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
  setSelectedLevelId: Dispatch<SetStateAction<string>>
  setQuizStartedAtMs: Dispatch<SetStateAction<number>>
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>
  setResults: Dispatch<SetStateAction<Record<string, boolean>>>
  setCorrected: Dispatch<SetStateAction<boolean>>
  setUploadedImages: Dispatch<SetStateAction<Record<string, string>>>
  setSharedQuiz: Dispatch<SetStateAction<ShareQuizPayload | null>>
  setSharedResult: Dispatch<SetStateAction<ResponderResult | null>>
  setResponderName: Dispatch<SetStateAction<string>>
  setResponderAvatarDataUrl: Dispatch<SetStateAction<string | null>>
  setResponderAvatarFile: Dispatch<SetStateAction<File | null>>
  goQuiz: (categoryId: string, levelId: string) => void
  goLevelResult: (categoryId: string, levelId: string) => void
  goFinal: () => void
  goLevels: (categoryId: string) => void
  goRespondResult: () => void
}

export const useGameplayActions = (params: UseGameplayActionsParams) => {
  const {
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
    setRecords,
    setDrafts,
    setSelectedCategoryId,
    setSelectedLevelId,
    setQuizStartedAtMs,
    setAnswers,
    setResults,
    setCorrected,
    setUploadedImages,
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
  } = params

  const resetQuizBuffers = () => {
    revokeBlobUrls(uploadedImages)
    setAnswers({})
    setResults({})
    setCorrected(false)
    setUploadedImages({})
    setSharedResult(null)
    setResponderName('')
    setResponderAvatarDataUrl(null)
    setResponderAvatarFile(null)
    setQuizStartedAtMs(Date.now())
  }

  const openLevel = (categoryId: string, levelId: string) => {
    const category = categories.find((item) => item.id === categoryId)
    const level = category?.levels.find((item) => item.id === levelId)

    if (!category || !level) {
      return
    }

    setSharedQuiz(null)
    resetQuizBuffers()

    setSelectedCategoryId(categoryId)
    setSelectedLevelId(levelId)
    setQuizStartedAtMs(Date.now())

    const draft = drafts[levelKey(categoryId, levelId)]
    if (draft) {
      setAnswers(draft.answers)
      setResults(draft.results)
      setCorrected(draft.corrected)
    }

    goQuiz(categoryId, levelId)
  }

  const handleCorrect = () => {
    if (!activeLevel) {
      return
    }

    const evaluation: Record<string, boolean> = {}

    for (const question of activeLevel.questions) {
      const acceptedAnswers =
        question.acceptedAnswers.length > 0
          ? question.acceptedAnswers
          : question.correctAnswerDisplay
            ? [question.correctAnswerDisplay]
            : []

      if (activeLevel.mode === 'blank') {
        evaluation[question.id] =
          acceptedAnswers.length > 0
            ? isAnswerCorrect(answers[question.id] ?? '', acceptedAnswers)
            : Boolean(answers[question.id]?.trim())
        continue
      }

      evaluation[question.id] = isAnswerCorrect(answers[question.id] ?? '', acceptedAnswers)
    }

    setResults(evaluation)
    setCorrected(true)
  }

  const handleFinishLevel = () => {
    if (!activeLevel || !corrected) {
      return
    }

    const score = activeLevel.questions.reduce(
      (accumulator, question) => accumulator + (results[question.id] ? 1 : 0),
      0,
    )
    const playMode: TimingMode = activeLevel.timingMode ?? 'timeless'
    const durationMs = playMode === 'speedrun' ? Math.max(1000, Date.now() - quizStartedAtMs) : 0
    const points =
      playMode === 'speedrun'
        ? calculateSpeedrunPoints(score, activeLevel.questions.length, durationMs)
        : score

    if (isResponderMode) {
      setSharedResult({
        score,
        total: activeLevel.questions.length,
        points,
        durationMs,
        playMode,
        attemptId: `submission-${crypto.randomUUID()}`,
      })
      goRespondResult()
      return
    }

    if (!selectedCategory || !selectedLevel) {
      return
    }

    const key = levelKey(selectedCategory.id, selectedLevel.id)
    const record: LevelRecord = {
      categoryId: selectedCategory.id,
      levelId: selectedLevel.id,
      score,
      total: selectedLevel.questions.length,
      points,
      durationMs,
      playMode,
      answers,
      results,
      completedAt: new Date().toISOString(),
    }

    setRecords((previous) => ({ ...previous, [key]: record }))
    setDrafts((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
    goLevelResult(selectedCategory.id, selectedLevel.id)
  }

  const handleNextAfterLevel = () => {
    if (!selectedCategory || selectedLevelIndex < 0) {
      return
    }

    const nextLevel = selectedCategory.levels[selectedLevelIndex + 1]
    if (nextLevel) {
      openLevel(selectedCategory.id, nextLevel.id)
      return
    }

    goFinal()
  }

  const handlePlayAgain = () => {
    if (!selectedCategory) {
      return
    }

    setRecords((previous) => removeCategoryKeys(previous, selectedCategory.id))
    setDrafts((previous) => removeCategoryKeys(previous, selectedCategory.id))
    setSelectedLevelId('')
    resetQuizBuffers()
    goLevels(selectedCategory.id)
  }

  const updateAnswer = (questionId: string, value: string) => {
    if (corrected) {
      return
    }

    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }))
  }

  return {
    openLevel,
    handleCorrect,
    handleFinishLevel,
    handleNextAfterLevel,
    handlePlayAgain,
    updateAnswer,
  }
}
