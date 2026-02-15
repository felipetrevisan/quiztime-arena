import type { Session } from '@supabase/supabase-js'
import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

import {
  fetchRemoteCategories,
  fetchRemoteRankings,
  saveRemoteRanking,
  seedRemoteCategories,
} from '@/services/supabase'
import type {
  AccessMode,
  Category,
  Level,
  LevelDraft,
  RankingEntry,
  ShareQuizPayload,
  ShareSubmissionPayload,
} from '@/types/quiz'
import { decodePayload } from '@/utils/share'

import { getUserProfile, levelKey, mergeRankings } from './shared'

interface PathState {
  categoryId?: string
  levelId?: string
}

export const useSyncRouteSelection = (params: {
  pathState: PathState
  selectedCategoryId: string
  selectedLevelId: string
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
  setSelectedLevelId: Dispatch<SetStateAction<string>>
}) => {
  const {
    pathState,
    selectedCategoryId,
    selectedLevelId,
    setSelectedCategoryId,
    setSelectedLevelId,
  } = params

  useEffect(() => {
    if (pathState.categoryId && pathState.categoryId !== selectedCategoryId) {
      setSelectedCategoryId(pathState.categoryId)
    }

    if (pathState.levelId && pathState.levelId !== selectedLevelId) {
      setSelectedLevelId(pathState.levelId)
    }
  }, [
    pathState.categoryId,
    pathState.levelId,
    selectedCategoryId,
    selectedLevelId,
    setSelectedCategoryId,
    setSelectedLevelId,
  ])
}

export const useServiceWorkerRegistration = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    void navigator.serviceWorker.register('/sw.js')
  }, [])
}

export const useSupabaseSession = (params: {
  remoteEnabled: boolean
  setAuthLoading: Dispatch<SetStateAction<boolean>>
  setSession: Dispatch<SetStateAction<Session | null>>
  supabaseSessionClient: {
    auth: {
      getSession: () => Promise<{ data: { session: Session | null } }>
      onAuthStateChange: (callback: (_event: string, nextSession: Session | null) => void) => {
        data: { subscription: { unsubscribe: () => void } }
      }
    }
  } | null
}) => {
  const { remoteEnabled, setAuthLoading, setSession, supabaseSessionClient } = params

  useEffect(() => {
    if (!remoteEnabled || !supabaseSessionClient) {
      setAuthLoading(false)
      return
    }

    let active = true

    void supabaseSessionClient.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const { data } = supabaseSessionClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [remoteEnabled, setAuthLoading, setSession, supabaseSessionClient])
}

export const useRemoteBootstrap = (params: {
  remoteEnabled: boolean
  remoteBootstrappedRef: MutableRefObject<boolean>
  session: Session | null
  isAdmin: boolean
  categories: Category[]
  setCategories: Dispatch<SetStateAction<Category[]>>
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
}) => {
  const {
    remoteEnabled,
    remoteBootstrappedRef,
    session,
    isAdmin,
    categories,
    setCategories,
    setRankings,
  } = params

  useEffect(() => {
    if (!remoteEnabled || remoteBootstrappedRef.current) {
      return
    }

    if (!session) {
      return
    }

    remoteBootstrappedRef.current = true

    void (async () => {
      const remoteCategories = await fetchRemoteCategories()

      if (remoteCategories && remoteCategories.length > 0) {
        setCategories(remoteCategories)
      } else if (isAdmin) {
        await seedRemoteCategories(categories)
      }

      const remoteRankings = await fetchRemoteRankings()
      if (remoteRankings && remoteRankings.length > 0) {
        setRankings((previous) => mergeRankings(previous, remoteRankings))
      }
    })()
  }, [
    categories,
    isAdmin,
    remoteBootstrappedRef,
    remoteEnabled,
    session,
    setCategories,
    setRankings,
  ])
}

export const useAccessAndSharedQuery = (params: {
  location: { pathname: string; searchStr: string }
  screen: string
  remoteEnabled: boolean
  session: Session | null
  isAdmin: boolean
  setAccessMode: Dispatch<SetStateAction<AccessMode>>
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
  setSharedQuiz: Dispatch<SetStateAction<ShareQuizPayload | null>>
  setRankingPreviewQuizId: Dispatch<SetStateAction<string | null>>
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
  setSelectedLevelId: Dispatch<SetStateAction<string>>
  setAnswers: Dispatch<SetStateAction<Record<string, string>>>
  setResults: Dispatch<SetStateAction<Record<string, boolean>>>
  setCorrected: Dispatch<SetStateAction<boolean>>
  setResponderName: Dispatch<SetStateAction<string>>
  setResponderAvatarDataUrl: Dispatch<SetStateAction<string | null>>
  setResponderAvatarFile: Dispatch<SetStateAction<File | null>>
  goQuiz: (categoryId: string, levelId: string) => void
  goRanking: () => void
}) => {
  const {
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
    setAnswers,
    setResults,
    setCorrected,
    setResponderName,
    setResponderAvatarDataUrl,
    setResponderAvatarFile,
    goQuiz,
    goRanking,
  } = params

  useEffect(() => {
    const query = new URLSearchParams(location.searchStr)
    const importParam = query.get('import')
    const respondParam = query.get('respond')
    const rankingParam = query.get('ranking')

    if (respondParam) {
      setAccessMode('responder')
    } else if (rankingParam) {
      setAccessMode('ranking')
    } else {
      setAccessMode('admin')
    }

    if (importParam) {
      if (remoteEnabled && (!session || !isAdmin)) {
        return
      }

      const submission = decodePayload<ShareSubmissionPayload>(importParam)

      if (submission?.version === 1) {
        setRankings((previous) => {
          if (previous.some((entry) => entry.submissionId === submission.submissionId)) {
            return previous
          }
          return [submission, ...previous]
        })

        void saveRemoteRanking(submission)
        if (screen !== 'ranking') {
          goRanking()
        }
      }

      query.delete('import')
      const nextQuery = query.toString()
      const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
      window.history.replaceState(null, '', nextUrl)
    }

    if (respondParam) {
      const payload = decodePayload<ShareQuizPayload>(respondParam)
      if (payload?.version === 1) {
        setSharedQuiz(payload)
        setSelectedCategoryId(payload.categoryId)
        setSelectedLevelId(payload.levelId)
        setAnswers({})
        setResults({})
        setCorrected(false)
        setResponderName('')
        setResponderAvatarDataUrl(null)
        setResponderAvatarFile(null)
        if (screen !== 'quiz') {
          goQuiz(payload.categoryId, payload.levelId)
        }
      }
    }

    if (rankingParam) {
      setRankingPreviewQuizId(rankingParam)
      if (screen !== 'ranking') {
        goRanking()
      }
    } else {
      setRankingPreviewQuizId(null)
    }
  }, [
    goQuiz,
    goRanking,
    isAdmin,
    location.pathname,
    location.searchStr,
    remoteEnabled,
    screen,
    session,
    setAccessMode,
    setAnswers,
    setCorrected,
    setRankings,
    setRankingPreviewQuizId,
    setResponderAvatarDataUrl,
    setResponderAvatarFile,
    setResponderName,
    setResults,
    setSelectedCategoryId,
    setSelectedLevelId,
    setSharedQuiz,
  ])
}

export const useEnsureSelectedCategory = (params: {
  isResponderMode: boolean
  categories: Category[]
  selectedCategoryId: string
  setSelectedCategoryId: Dispatch<SetStateAction<string>>
}) => {
  const { isResponderMode, categories, selectedCategoryId, setSelectedCategoryId } = params

  useEffect(() => {
    if (isResponderMode) {
      return
    }

    if (categories.length === 0) {
      setSelectedCategoryId('')
      return
    }

    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, isResponderMode, selectedCategoryId, setSelectedCategoryId])
}

export const useResponderProfileSeed = (params: {
  isResponderMode: boolean
  session: Session | null
  responderName: string
  responderAvatarDataUrl: string | null
  setResponderName: Dispatch<SetStateAction<string>>
  setResponderAvatarDataUrl: Dispatch<SetStateAction<string | null>>
}) => {
  const {
    isResponderMode,
    session,
    responderName,
    responderAvatarDataUrl,
    setResponderName,
    setResponderAvatarDataUrl,
  } = params

  useEffect(() => {
    if (!isResponderMode || !session) {
      return
    }

    const profile = getUserProfile(session)
    if (profile.name && !responderName.trim()) {
      setResponderName(profile.name)
    }

    if (profile.avatarUrl && !responderAvatarDataUrl) {
      setResponderAvatarDataUrl(profile.avatarUrl)
    }
  }, [
    isResponderMode,
    responderAvatarDataUrl,
    responderName,
    session,
    setResponderAvatarDataUrl,
    setResponderName,
  ])
}

export const usePersistQuizDraft = (params: {
  isResponderMode: boolean
  screen: string
  selectedCategory: Category | null
  selectedLevel: Level | null
  answers: Record<string, string>
  results: Record<string, boolean>
  corrected: boolean
  setDrafts: Dispatch<SetStateAction<Record<string, LevelDraft>>>
}) => {
  const {
    isResponderMode,
    screen,
    selectedCategory,
    selectedLevel,
    answers,
    results,
    corrected,
    setDrafts,
  } = params

  useEffect(() => {
    if (isResponderMode || screen !== 'quiz' || !selectedCategory || !selectedLevel) {
      return
    }

    const key = levelKey(selectedCategory.id, selectedLevel.id)
    setDrafts((previous) => ({
      ...previous,
      [key]: {
        answers,
        results,
        corrected,
      },
    }))
  }, [
    answers,
    corrected,
    isResponderMode,
    results,
    screen,
    selectedCategory,
    selectedLevel,
    setDrafts,
  ])
}

export const useObjectUrlCleanup = (params: {
  frameImage: string | null
  uploadedImages: Record<string, string>
}) => {
  const { frameImage, uploadedImages } = params

  useEffect(() => {
    return () => {
      if (frameImage?.startsWith('blob:')) {
        URL.revokeObjectURL(frameImage)
      }

      for (const url of Object.values(uploadedImages)) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      }
    }
  }, [frameImage, uploadedImages])
}
