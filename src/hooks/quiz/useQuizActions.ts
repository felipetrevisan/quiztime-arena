import type { Dispatch, SetStateAction } from 'react'

import type {
  AppConfig,
  Category,
  Level,
  LevelDraft,
  LevelRecord,
  RankingEntry,
  ResponderResult,
  ShareQuizPayload,
} from '@/types/quiz'

import { useBuilderActions } from './actions/useBuilderActions'
import { useGameplayActions } from './actions/useGameplayActions'
import { useShareActions } from './actions/useShareActions'

interface UseQuizActionsParams {
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
  shareLinks: Record<string, string>
  shareQuizIds: Record<string, string>
  rankingPreviewLinks: Record<string, string>
  shortLinks: Record<string, string>
  rankings: RankingEntry[]
  sharedQuiz: ShareQuizPayload | null
  sharedResult: ResponderResult | null
  config: AppConfig
  currentUserId: string | null
  responderName: string
  responderAvatarDataUrl: string | null
  responderAvatarFile: File | null
  remoteEnabled: boolean
  setCategories: Dispatch<SetStateAction<Category[]>>
  setRecords: Dispatch<SetStateAction<Record<string, LevelRecord>>>
  setDrafts: Dispatch<SetStateAction<Record<string, LevelDraft>>>
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
  setSelectedLevelId: Dispatch<SetStateAction<string>>
  setQuizStartedAtMs: Dispatch<SetStateAction<number>>
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>
  setResults: Dispatch<SetStateAction<Record<string, boolean>>>
  setCorrected: Dispatch<SetStateAction<boolean>>
  setFrameImage: Dispatch<SetStateAction<string | null>>
  setUploadedImages: Dispatch<SetStateAction<Record<string, string>>>
  setShareLinks: Dispatch<SetStateAction<Record<string, string>>>
  setShareQuizIds: Dispatch<SetStateAction<Record<string, string>>>
  setRankingPreviewLinks: Dispatch<SetStateAction<Record<string, string>>>
  setShortLinks: Dispatch<SetStateAction<Record<string, string>>>
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
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

export const useQuizActions = (params: UseQuizActionsParams) => {
  const gameplayActions = useGameplayActions({
    categories: params.categories,
    selectedCategory: params.selectedCategory,
    selectedLevel: params.selectedLevel,
    selectedLevelIndex: params.selectedLevelIndex,
    activeLevel: params.activeLevel,
    isResponderMode: params.isResponderMode,
    corrected: params.corrected,
    quizStartedAtMs: params.quizStartedAtMs,
    answers: params.answers,
    results: params.results,
    drafts: params.drafts,
    uploadedImages: params.uploadedImages,
    setRecords: params.setRecords,
    setDrafts: params.setDrafts,
    setSelectedCategoryId: params.setSelectedCategoryId,
    setSelectedLevelId: params.setSelectedLevelId,
    setQuizStartedAtMs: params.setQuizStartedAtMs,
    setAnswers: params.setAnswers,
    setResults: params.setResults,
    setCorrected: params.setCorrected,
    setUploadedImages: params.setUploadedImages,
    setSharedQuiz: params.setSharedQuiz,
    setSharedResult: params.setSharedResult,
    setResponderName: params.setResponderName,
    setResponderAvatarDataUrl: params.setResponderAvatarDataUrl,
    setResponderAvatarFile: params.setResponderAvatarFile,
    goQuiz: params.goQuiz,
    goLevelResult: params.goLevelResult,
    goFinal: params.goFinal,
    goLevels: params.goLevels,
    goRespondResult: params.goRespondResult,
  })

  const builderActions = useBuilderActions({
    categories: params.categories,
    selectedCategory: params.selectedCategory,
    selectedLevel: params.selectedLevel,
    remoteEnabled: params.remoteEnabled,
    setFrameImage: params.setFrameImage,
    setUploadedImages: params.setUploadedImages,
    setCategories: params.setCategories,
  })

  const shareActions = useShareActions({
    selectedCategory: params.selectedCategory,
    shareLinks: params.shareLinks,
    shareQuizIds: params.shareQuizIds,
    rankingPreviewLinks: params.rankingPreviewLinks,
    shortLinks: params.shortLinks,
    rankings: params.rankings,
    sharedQuiz: params.sharedQuiz,
    sharedResult: params.sharedResult,
    config: params.config,
    currentUserId: params.currentUserId,
    responderName: params.responderName,
    responderAvatarDataUrl: params.responderAvatarDataUrl,
    responderAvatarFile: params.responderAvatarFile,
    answers: params.answers,
    results: params.results,
    remoteEnabled: params.remoteEnabled,
    setRankings: params.setRankings,
    setShareLinks: params.setShareLinks,
    setShareQuizIds: params.setShareQuizIds,
    setRankingPreviewLinks: params.setRankingPreviewLinks,
    setShortLinks: params.setShortLinks,
    setResponderAvatarFile: params.setResponderAvatarFile,
    setResponderAvatarDataUrl: params.setResponderAvatarDataUrl,
  })

  return {
    ...gameplayActions,
    ...builderActions,
    ...shareActions,
  }
}
