import { useRef, useState } from 'react'

import { initialCategories } from '@/data/levels'
import type {
  AccessMode,
  AppConfig,
  Category,
  LevelDraft,
  LevelRecord,
  RankingEntry,
  ResponderResult,
  ShareQuizPayload,
} from '@/types/quiz'
import { useLocalStorageState } from '@/utils/storage'

import { defaultConfig } from './shared'

export const useQuizStoredState = (remoteEnabled: boolean) => {
  const [categories, setCategories] = useLocalStorageState<Category[]>(
    'quiztime.categories.v1',
    initialCategories,
  )
  const [config, setConfig] = useLocalStorageState<AppConfig>('quiztime.config.v1', defaultConfig)
  const [records, setRecords] = useLocalStorageState<Record<string, LevelRecord>>(
    'quiztime.records.v1',
    {},
  )
  const [drafts, setDrafts] = useLocalStorageState<Record<string, LevelDraft>>(
    'quiztime.drafts.v1',
    {},
  )
  const [rankings, setRankings] = useLocalStorageState<RankingEntry[]>('quiztime.rankings.v1', [])
  const [selectedCategoryId, setSelectedCategoryId] = useLocalStorageState<string>(
    'quiztime.category.v1',
    initialCategories[0]?.id ?? '',
  )

  const [selectedLevelId, setSelectedLevelId] = useState<string>('')
  const [quizStartedAtMs, setQuizStartedAtMs] = useState<number>(Date.now())
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [corrected, setCorrected] = useState(false)
  const [frameImage, setFrameImage] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({})
  const [shareLinks, setShareLinks] = useLocalStorageState<Record<string, string>>(
    'quiztime.share-links.v1',
    {},
  )
  const [shareQuizIds, setShareQuizIds] = useLocalStorageState<Record<string, string>>(
    'quiztime.share-quiz-ids.v1',
    {},
  )
  const [rankingPreviewLinks, setRankingPreviewLinks] = useLocalStorageState<
    Record<string, string>
  >('quiztime.ranking-preview-links.v1', {})
  const [shortLinks, setShortLinks] = useLocalStorageState<Record<string, string>>(
    'quiztime.short-links.v1',
    {},
  )
  const [sharedQuiz, setSharedQuiz] = useState<ShareQuizPayload | null>(null)
  const [rankingPreviewQuizId, setRankingPreviewQuizId] = useState<string | null>(null)
  const [accessMode, setAccessMode] = useState<AccessMode>('admin')
  const [sharedResult, setSharedResult] = useState<ResponderResult | null>(null)
  const [responderName, setResponderName] = useState('')
  const [responderAvatarDataUrl, setResponderAvatarDataUrl] = useState<string | null>(null)
  const [responderAvatarFile, setResponderAvatarFile] = useState<File | null>(null)
  const [authLoading, setAuthLoading] = useState(remoteEnabled)

  const remoteBootstrappedRef = useRef(false)

  return {
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
  }
}
