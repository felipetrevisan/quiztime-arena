import type { Dispatch, SetStateAction } from 'react'

import { saveRemoteRanking, uploadRemoteAsset } from '@/services/supabase'
import type {
  AppConfig,
  Category,
  RankingEntry,
  ResponderResult,
  ShareQuizPayload,
  ShareSubmissionPayload,
} from '@/types/quiz'
import { fileToAvatarDataUrl } from '@/utils/image'
import { copyText, encodePayload } from '@/utils/share'
import { getPublicAppBaseUrl } from '@/utils/url'

import { levelKey } from '../shared'
import { getFileExtension } from './shared'

interface UseShareActionsParams {
  selectedCategory: Category | null
  shareLinks: Record<string, string>
  shareQuizIds: Record<string, string>
  rankingPreviewLinks: Record<string, string>
  shortLinks: Record<string, string>
  rankings: RankingEntry[]
  sharedQuiz: ShareQuizPayload | null
  sharedResult: ResponderResult | null
  config: AppConfig
  responderName: string
  responderAvatarDataUrl: string | null
  responderAvatarFile: File | null
  answers: Record<string, string>
  results: Record<string, boolean>
  remoteEnabled: boolean
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
  setShareLinks: Dispatch<SetStateAction<Record<string, string>>>
  setShareQuizIds: Dispatch<SetStateAction<Record<string, string>>>
  setRankingPreviewLinks: Dispatch<SetStateAction<Record<string, string>>>
  setShortLinks: Dispatch<SetStateAction<Record<string, string>>>
  setResponderAvatarFile: Dispatch<SetStateAction<File | null>>
  setResponderAvatarDataUrl: Dispatch<SetStateAction<string | null>>
}

export const useShareActions = (params: UseShareActionsParams) => {
  const {
    selectedCategory,
    shareLinks,
    shareQuizIds,
    rankingPreviewLinks,
    shortLinks,
    rankings,
    sharedQuiz,
    sharedResult,
    config,
    responderName,
    responderAvatarDataUrl,
    responderAvatarFile,
    answers,
    results,
    remoteEnabled,
    setRankings,
    setShareLinks,
    setShareQuizIds,
    setRankingPreviewLinks,
    setShortLinks,
    setResponderAvatarFile,
    setResponderAvatarDataUrl,
  } = params

  const appBaseUrl = getPublicAppBaseUrl()

  const handleGenerateShareLink = async (levelId: string) => {
    if (!selectedCategory) {
      return
    }

    const level = selectedCategory.levels.find((item) => item.id === levelId)
    if (!level) {
      return
    }

    const quizId = `quiz-${crypto.randomUUID()}`
    const payload: ShareQuizPayload = {
      version: 1,
      quizId,
      categoryId: selectedCategory.id,
      categoryTitle: selectedCategory.title,
      levelId: level.id,
      title: config.title,
      subtitle: config.subtitle,
      themeId: config.themeId,
      level,
    }

    const encoded = encodePayload(payload)
    const shareLink = `${appBaseUrl}/?respond=${encoded}`
    const key = levelKey(selectedCategory.id, level.id)
    const rankingPreviewLink = `${appBaseUrl}/ranking?ranking=${encodeURIComponent(quizId)}`

    setShareLinks((previous) => ({
      ...previous,
      [key]: shareLink,
    }))
    setShareQuizIds((previous) => ({
      ...previous,
      [key]: quizId,
    }))
    setRankingPreviewLinks((previous) => ({
      ...previous,
      [key]: rankingPreviewLink,
    }))
    setShortLinks((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })

    void copyText(shareLink)
  }

  const handleCopyShareLink = async (levelId: string) => {
    if (!selectedCategory) {
      return
    }

    const key = levelKey(selectedCategory.id, levelId)
    const link = shortLinks[key] ?? shareLinks[key]
    if (!link) {
      return
    }

    await copyText(link)
  }

  const handleShareRankingPreview = async (levelId: string) => {
    if (!selectedCategory) {
      return
    }

    const key = levelKey(selectedCategory.id, levelId)
    const existing = rankingPreviewLinks[key]
    if (existing) {
      await copyText(existing)
      return
    }

    const quizId = shareQuizIds[key]
    if (!quizId) {
      return
    }

    const previewLink = `${appBaseUrl}/ranking?ranking=${encodeURIComponent(quizId)}`
    setRankingPreviewLinks((previous) => ({
      ...previous,
      [key]: previewLink,
    }))

    await copyText(previewLink)
  }

  const handleShortenShareLink = async (levelId: string) => {
    if (!selectedCategory) {
      return
    }

    const key = levelKey(selectedCategory.id, levelId)
    const link = shareLinks[key]
    if (!link) {
      return
    }

    const endpoints = [
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(link)}`,
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(link)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(link)}`,
      )}`,
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint)
        const shortened = (await response.text()).trim()

        if (!response.ok || !shortened.startsWith('http')) {
          continue
        }

        setShortLinks((previous) => ({
          ...previous,
          [key]: shortened,
        }))

        await copyText(shortened)
        return
      } catch {
        // tenta o proximo endpoint
      }
    }

    await copyText(link)
  }

  const handleBuildSubmissionLink = async (): Promise<string> => {
    if (!sharedQuiz || !sharedResult) {
      return ''
    }

    const safeName = responderName.trim()
    if (!safeName) {
      return ''
    }

    let avatarValue = responderAvatarDataUrl

    if (remoteEnabled && responderAvatarFile) {
      const extension = getFileExtension(responderAvatarFile.name)
      const avatarPath = `avatars/${safeName.replace(/\s+/g, '-').toLowerCase()}-${crypto.randomUUID()}.${extension}`
      const remoteAvatarUrl = await uploadRemoteAsset(responderAvatarFile, avatarPath)
      if (remoteAvatarUrl) {
        avatarValue = remoteAvatarUrl
      }
    }

    const payload: ShareSubmissionPayload = {
      version: 1,
      submissionId: sharedResult.attemptId,
      quizId: sharedQuiz.quizId,
      responderName: safeName,
      responderAvatarDataUrl: avatarValue,
      categoryTitle: sharedQuiz.categoryTitle,
      levelTitle: sharedQuiz.level.title,
      score: sharedResult.score,
      total: sharedResult.total,
      answers,
      results,
      submittedAt: new Date().toISOString(),
    }

    const encoded = encodePayload(payload)
    return `${appBaseUrl}/ranking?import=${encoded}`
  }

  const handleSubmitResponderResult = async (): Promise<boolean> => {
    if (!sharedQuiz || !sharedResult) {
      return false
    }

    const safeName = responderName.trim() || 'Jogador'
    let avatarValue = responderAvatarDataUrl

    if (remoteEnabled && responderAvatarFile) {
      const extension = getFileExtension(responderAvatarFile.name)
      const avatarPath = `avatars/${safeName.replace(/\s+/g, '-').toLowerCase()}-${crypto.randomUUID()}.${extension}`
      const remoteAvatarUrl = await uploadRemoteAsset(responderAvatarFile, avatarPath)
      if (remoteAvatarUrl) {
        avatarValue = remoteAvatarUrl
      }
    }

    const entry: RankingEntry = {
      version: 1,
      submissionId: sharedResult.attemptId,
      quizId: sharedQuiz.quizId,
      responderName: safeName,
      responderAvatarDataUrl: avatarValue,
      categoryTitle: sharedQuiz.categoryTitle,
      levelTitle: sharedQuiz.level.title,
      score: sharedResult.score,
      total: sharedResult.total,
      answers,
      results,
      submittedAt: new Date().toISOString(),
    }

    if (rankings.some((item) => item.submissionId === entry.submissionId)) {
      return true
    }

    if (remoteEnabled) {
      const saved = await saveRemoteRanking(entry)
      if (!saved) {
        return false
      }
    }

    setRankings((previous) => {
      if (previous.some((item) => item.submissionId === entry.submissionId)) {
        return previous
      }
      return [entry, ...previous]
    })

    return true
  }

  const handleResponderAvatarUpload = async (file: File) => {
    const dataUrl = await fileToAvatarDataUrl(file)
    setResponderAvatarFile(file)
    setResponderAvatarDataUrl(dataUrl)
  }

  return {
    handleGenerateShareLink,
    handleCopyShareLink,
    handleShareRankingPreview,
    handleShortenShareLink,
    handleBuildSubmissionLink,
    handleSubmitResponderResult,
    handleResponderAvatarUpload,
  }
}
