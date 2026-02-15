import { AnswerSheet } from '@/components/AnswerSheet'
import { BuilderPanel } from '@/components/BuilderPanel'
import { ConfigPanel } from '@/components/ConfigPanel'
import { Frame } from '@/components/Frame'
import { Header } from '@/components/Header'
import { initialCategories } from '@/data/levels'
import { themes } from '@/data/themes'
import { AccessDeniedScreen } from '@/pages/AccessDeniedScreen'
import { AuthScreen } from '@/pages/AuthScreen'
import { CategoriesScreen } from '@/pages/CategoriesScreen'
import { FinalScreen } from '@/pages/FinalScreen'
import { HomeScreen } from '@/pages/HomeScreen'
import { LevelResultScreen } from '@/pages/LevelResultScreen'
import { LevelsScreen } from '@/pages/LevelsScreen'
import { QuizScreen } from '@/pages/QuizScreen'
import { RankingScreen } from '@/pages/RankingScreen'
import { RespondResultScreen } from '@/pages/RespondResultScreen'
import {
  fetchRemoteCategories,
  fetchRemoteRankings,
  hasRemote,
  saveRemoteRanking,
  seedRemoteCategories,
  updateRemoteQuestionImage,
  uploadRemoteAsset,
  upsertRemoteCategory,
  upsertRemoteLevel,
} from '@/services/supabase'
import type {
  AccessMode,
  AppConfig,
  Category,
  LevelDraft,
  LevelMode,
  LevelRecord,
  RankingEntry,
  Screen,
  ShareQuizPayload,
  ShareSubmissionPayload,
  ThemeId,
} from '@/types/quiz'
import { createEmptyLevel } from '@/utils/builder'
import { fileToAvatarDataUrl } from '@/utils/image'
import { isAnswerCorrect } from '@/utils/normalize'
import { getBadge, getComment } from '@/utils/scoring'
import { copyText, decodePayload, encodePayload } from '@/utils/share'
import { useLocalStorageState } from '@/utils/storage'
import { supabase } from '@/utils/supabase'
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

const defaultConfig: AppConfig = {
  title: 'BEATRIZ PERAZZO',
  subtitle: 'QUIZ TIME',
  themeId: 'neon-purple',
}

const levelKey = (categoryId: string, levelId: string): string => `${categoryId}:${levelId}`

const removeCategoryKeys = <T extends Record<string, unknown>>(
  source: T,
  categoryId: string,
): T => {
  const next = { ...source }
  for (const key of Object.keys(next)) {
    if (key.startsWith(`${categoryId}:`)) {
      delete next[key]
    }
  }
  return next
}

const screenVariants = {
  initial: { opacity: 0, x: 42 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -42 },
}

const getUniqueCategoryId = (categories: Category[], requestedId: string): string => {
  const base = requestedId || `categoria-${crypto.randomUUID().slice(0, 8)}`
  if (!categories.some((item) => item.id === base)) {
    return base
  }

  let counter = 2
  let candidate = `${base}-${counter}`
  while (categories.some((item) => item.id === candidate)) {
    counter += 1
    candidate = `${base}-${counter}`
  }

  return candidate
}

const mergeRankings = (
  localEntries: RankingEntry[],
  remoteEntries: RankingEntry[],
): RankingEntry[] => {
  const map = new Map<string, RankingEntry>()

  for (const entry of [...remoteEntries, ...localEntries]) {
    if (!map.has(entry.submissionId)) {
      map.set(entry.submissionId, entry)
    }
  }

  return [...map.values()].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  )
}

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

const getUserProfile = (session: Session | null): { name: string; avatarUrl: string | null } => {
  if (!session) {
    return { name: '', avatarUrl: null }
  }

  const metadata = session.user.user_metadata as Record<string, unknown> | undefined

  const displayNameCandidates = [
    metadata?.name,
    metadata?.full_name,
    metadata?.user_name,
    session.user.email,
  ]
  const avatarCandidates = [metadata?.avatar_url, metadata?.picture]

  const name = displayNameCandidates.find((value): value is string => typeof value === 'string')
  const avatarUrl = avatarCandidates.find((value): value is string => typeof value === 'string')

  return {
    name: name?.trim() ?? '',
    avatarUrl: avatarUrl?.trim() ?? null,
  }
}

function App() {
  const frameRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const [screen, setScreen] = useState<Screen>('home')
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
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [corrected, setCorrected] = useState(false)
  const [frameImage, setFrameImage] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({})
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({})
  const [shareQuizIds, setShareQuizIds] = useState<Record<string, string>>({})
  const [rankingPreviewLinks, setRankingPreviewLinks] = useState<Record<string, string>>({})
  const [shortLinks, setShortLinks] = useState<Record<string, string>>({})
  const [sharedQuiz, setSharedQuiz] = useState<ShareQuizPayload | null>(null)
  const [rankingPreviewQuizId, setRankingPreviewQuizId] = useState<string | null>(null)
  const [accessMode, setAccessMode] = useState<AccessMode>('admin')
  const [sharedResult, setSharedResult] = useState<{ score: number; total: number } | null>(null)
  const [responderName, setResponderName] = useState('')
  const [responderAvatarDataUrl, setResponderAvatarDataUrl] = useState<string | null>(null)
  const [responderAvatarFile, setResponderAvatarFile] = useState<File | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(hasRemote())
  const frameImageRef = useRef<string | null>(null)
  const uploadedImagesRef = useRef<Record<string, string>>({})
  const categoriesRef = useRef(categories)
  const remoteBootstrappedRef = useRef(false)

  const isResponderMode = Boolean(sharedQuiz)
  const isRankingPreviewMode = Boolean(rankingPreviewQuizId)
  const hasSession = Boolean(session)
  const userEmail = session?.user.email?.toLowerCase() ?? ''
  const isAdmin = !hasRemote() || adminEmails.length === 0 || adminEmails.includes(userEmail)

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null
  const selectedLevel =
    selectedCategory?.levels.find((level) => level.id === selectedLevelId) ?? null
  const selectedLevelIndex =
    selectedCategory?.levels.findIndex((level) => level.id === selectedLevelId) ?? -1

  const activeLevel = sharedQuiz?.level ?? selectedLevel
  const activeThemeId = sharedQuiz?.themeId ?? config.themeId
  const activeTheme = themes.find((themeOption) => themeOption.id === activeThemeId) ?? themes[0]

  const headerTitle = sharedQuiz?.title ?? config.title
  const headerSubtitle = sharedQuiz?.subtitle ?? config.subtitle

  const activeRecord = useMemo(() => {
    if (!selectedCategory || !selectedLevel) return null
    return records[levelKey(selectedCategory.id, selectedLevel.id)] ?? null
  }, [records, selectedCategory, selectedLevel])

  const categoryTotals = useMemo(() => {
    if (!selectedCategory) return { score: 0, total: 0 }

    return selectedCategory.levels.reduce(
      (accumulator, level) => {
        const record = records[levelKey(selectedCategory.id, level.id)]
        if (!record) return accumulator

        return {
          score: accumulator.score + record.score,
          total: accumulator.total + record.total,
        }
      },
      { score: 0, total: 0 },
    )
  }, [records, selectedCategory])

  useEffect(() => {
    categoriesRef.current = categories
  }, [categories])

  useEffect(() => {
    if (!hasRemote() || !supabase) {
      setAuthLoading(false)
      return
    }

    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setAuthLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasRemote() || remoteBootstrappedRef.current) {
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
        await seedRemoteCategories(categoriesRef.current)
      }

      const remoteRankings = await fetchRemoteRankings()
      if (remoteRankings && remoteRankings.length > 0) {
        setRankings((previous) => mergeRankings(previous, remoteRankings))
      }
    })()
  }, [isAdmin, session, setCategories, setRankings])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const importParam = params.get('import')
    const respondParam = params.get('respond')
    const rankingParam = params.get('ranking')

    if (respondParam) {
      setAccessMode('responder')
    } else if (rankingParam) {
      setAccessMode('ranking')
    } else {
      setAccessMode('admin')
    }

    if (importParam) {
      if (hasRemote() && (!session || !isAdmin)) {
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
        setScreen('ranking')
      }

      params.delete('import')
      const nextQuery = params.toString()
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
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
        setScreen('quiz')
      }
    }

    if (rankingParam) {
      setRankingPreviewQuizId(rankingParam)
      setScreen('ranking')
    } else {
      setRankingPreviewQuizId(null)
    }
  }, [isAdmin, session, setRankings, setSelectedCategoryId])

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
  }, [isResponderMode, responderAvatarDataUrl, responderName, session])

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

  useEffect(() => {
    frameImageRef.current = frameImage
  }, [frameImage])

  useEffect(() => {
    uploadedImagesRef.current = uploadedImages
  }, [uploadedImages])

  useEffect(() => {
    return () => {
      const currentFrameImage = frameImageRef.current
      if (currentFrameImage?.startsWith('blob:')) {
        URL.revokeObjectURL(currentFrameImage)
      }

      for (const url of Object.values(uploadedImagesRef.current)) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      }
    }
  }, [])

  const resetQuizBuffers = () => {
    for (const url of Object.values(uploadedImages)) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }

    setAnswers({})
    setResults({})
    setCorrected(false)
    setUploadedImages({})
    setSharedResult(null)
    setResponderName('')
    setResponderAvatarDataUrl(null)
    setResponderAvatarFile(null)
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

    const draft = drafts[levelKey(categoryId, levelId)]
    if (draft) {
      setAnswers(draft.answers)
      setResults(draft.results)
      setCorrected(draft.corrected)
    }

    setScreen('quiz')
  }

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (!supabase) {
      return
    }

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.href,
      },
    })
  }

  const handleSignOut = async () => {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
  }

  const handleCorrect = () => {
    if (!activeLevel) return

    const evaluation: Record<string, boolean> = {}

    if (activeLevel.mode === 'blank') {
      for (const question of activeLevel.questions) {
        const acceptedAnswers =
          question.acceptedAnswers.length > 0
            ? question.acceptedAnswers
            : question.correctAnswerDisplay
              ? [question.correctAnswerDisplay]
              : []

        evaluation[question.id] =
          acceptedAnswers.length > 0
            ? isAnswerCorrect(answers[question.id] ?? '', acceptedAnswers)
            : Boolean(answers[question.id]?.trim())
      }

      setResults(evaluation)
      setCorrected(true)
      return
    }

    for (const question of activeLevel.questions) {
      const acceptedAnswers =
        question.acceptedAnswers.length > 0
          ? question.acceptedAnswers
          : question.correctAnswerDisplay
            ? [question.correctAnswerDisplay]
            : []
      evaluation[question.id] = isAnswerCorrect(answers[question.id] ?? '', acceptedAnswers)
    }

    setResults(evaluation)
    setCorrected(true)
  }

  const handleFinishLevel = () => {
    if (!activeLevel || !corrected) return

    const score = activeLevel.questions.reduce(
      (accumulator, question) => accumulator + (results[question.id] ? 1 : 0),
      0,
    )

    if (isResponderMode) {
      setSharedResult({
        score,
        total: activeLevel.questions.length,
      })
      setScreen('respondResult')
      return
    }

    if (!selectedCategory || !selectedLevel) return

    const key = levelKey(selectedCategory.id, selectedLevel.id)
    const record: LevelRecord = {
      categoryId: selectedCategory.id,
      levelId: selectedLevel.id,
      score,
      total: selectedLevel.questions.length,
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
    setScreen('levelResult')
  }

  const handleNextAfterLevel = () => {
    if (!selectedCategory || selectedLevelIndex < 0) return

    const nextLevel = selectedCategory.levels[selectedLevelIndex + 1]

    if (nextLevel) {
      openLevel(selectedCategory.id, nextLevel.id)
      return
    }

    setScreen('final')
  }

  const handleBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setFrameImage((previous) => {
      if (previous?.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return url
    })
    event.target.value = ''
  }

  const handleQuestionImageUpload = async (questionId: string, file: File) => {
    const url = URL.createObjectURL(file)
    setUploadedImages((previous) => {
      const oldUrl = previous[questionId]
      if (oldUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl)
      }

      return {
        ...previous,
        [questionId]: url,
      }
    })

    if (!hasRemote() || !selectedCategory || !selectedLevel) {
      return
    }

    const extension = file.name.includes('.')
      ? file.name.split('.')[file.name.split('.').length - 1]
      : 'jpg'
    const remotePath = `questions/${selectedCategory.id}/${selectedLevel.id}/${questionId}.${extension}`
    const remoteUrl = await uploadRemoteAsset(file, remotePath)

    if (!remoteUrl) {
      return
    }

    await updateRemoteQuestionImage(questionId, remoteUrl)

    setUploadedImages((previous) => {
      const previousUrl = previous[questionId]
      if (previousUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl)
      }

      return {
        ...previous,
        [questionId]: remoteUrl,
      }
    })

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== selectedCategory.id) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => {
            if (level.id !== selectedLevel.id) {
              return level
            }

            return {
              ...level,
              questions: level.questions.map((question) =>
                question.id === questionId ? { ...question, imagePath: remoteUrl } : question,
              ),
            }
          }),
        }
      }),
    )
  }

  const handleAddCategory = async (category: Category) => {
    const currentCategories = categoriesRef.current
    const uniqueId = getUniqueCategoryId(currentCategories, category.id)
    const nextCategory = { ...category, id: uniqueId }

    setCategories((previous) => [...previous, nextCategory])

    if (hasRemote()) {
      await upsertRemoteCategory(nextCategory, currentCategories.length)
    }
  }

  const handleAddLevel = (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
  ) => {
    const newLevel = createEmptyLevel(levelTitle, levelDescription, mode)

    const currentCategory = categoriesRef.current.find((category) => category.id === categoryId)
    const levelPosition = currentCategory?.levels.length ?? 0

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) return category
        return {
          ...category,
          levels: [...category.levels, newLevel],
        }
      }),
    )

    if (hasRemote()) {
      void upsertRemoteLevel(categoryId, newLevel, levelPosition)
    }
  }

  const handleUpdateQuestion = async (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => {
    const { categoryId, levelId, questionId, prompt, correctAnswerDisplay, acceptedAnswers } =
      payload

    const currentCategory = categoriesRef.current.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1

    if (!currentCategory || !currentLevel) {
      return
    }

    const nextLevel = {
      ...currentLevel,
      questions: currentLevel.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              prompt,
              correctAnswerDisplay,
              acceptedAnswers,
            }
          : question,
      ),
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    if (hasRemote()) {
      await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    }
  }

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
    const shareLink = `${window.location.origin}${window.location.pathname}?respond=${encoded}`
    const key = levelKey(selectedCategory.id, level.id)
    const rankingPreviewLink = `${window.location.origin}${window.location.pathname}?ranking=${encodeURIComponent(quizId)}`

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

    void copyText(shareLink)
  }

  const handleCopyShareLink = async (levelId: string) => {
    if (!selectedCategory) return

    const key = levelKey(selectedCategory.id, levelId)
    const link = shortLinks[key] ?? shareLinks[key]
    if (!link) return

    await copyText(link)
  }

  const handleShareRankingPreview = async (levelId: string) => {
    if (!selectedCategory) return

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

    const previewLink = `${window.location.origin}${window.location.pathname}?ranking=${encodeURIComponent(quizId)}`
    setRankingPreviewLinks((previous) => ({
      ...previous,
      [key]: previewLink,
    }))

    await copyText(previewLink)
  }

  const handleShortenShareLink = async (levelId: string) => {
    if (!selectedCategory) return

    const key = levelKey(selectedCategory.id, levelId)
    const link = shareLinks[key]
    if (!link) return

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

    if (hasRemote() && responderAvatarFile) {
      const extension = responderAvatarFile.name.includes('.')
        ? responderAvatarFile.name.split('.')[responderAvatarFile.name.split('.').length - 1]
        : 'jpg'
      const avatarPath = `avatars/${safeName.replace(/\s+/g, '-').toLowerCase()}-${crypto.randomUUID()}.${extension}`
      const remoteAvatarUrl = await uploadRemoteAsset(responderAvatarFile, avatarPath)
      if (remoteAvatarUrl) {
        avatarValue = remoteAvatarUrl
      }
    }

    const payload: ShareSubmissionPayload = {
      version: 1,
      submissionId: `submission-${crypto.randomUUID()}`,
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
    return `${window.location.origin}${window.location.pathname}?import=${encoded}`
  }

  const handleResponderAvatarUpload = async (file: File) => {
    const dataUrl = await fileToAvatarDataUrl(file)
    setResponderAvatarFile(file)
    setResponderAvatarDataUrl(dataUrl)
  }

  const handlePlayAgain = () => {
    if (!selectedCategory) return
    setRecords((previous) => removeCategoryKeys(previous, selectedCategory.id))
    setDrafts((previous) => removeCategoryKeys(previous, selectedCategory.id))
    setSelectedLevelId('')
    resetQuizBuffers()
    setScreen('levels')
  }

  const finalPercent =
    categoryTotals.total > 0 ? Math.round((categoryTotals.score / categoryTotals.total) * 100) : 0
  const rankingEntries = rankingPreviewQuizId
    ? rankings.filter((entry) => entry.quizId === rankingPreviewQuizId)
    : rankings

  const screenContent = (() => {
    if (
      !isResponderMode &&
      !selectedCategory &&
      screen !== 'home' &&
      screen !== 'categories' &&
      screen !== 'ranking'
    ) {
      return (
        <HomeScreen
          onStart={() => setScreen('categories')}
          onOpenRanking={() => setScreen('ranking')}
        />
      )
    }

    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            onStart={() => setScreen('categories')}
            onOpenRanking={() => setScreen('ranking')}
          />
        )

      case 'categories':
        return (
          <CategoriesScreen
            categories={categories}
            onBack={() => setScreen('home')}
            onSelect={(categoryId) => {
              setSharedQuiz(null)
              setSelectedCategoryId(categoryId)
              setSelectedLevelId('')
              setScreen('levels')
            }}
          />
        )

      case 'levels':
        if (!selectedCategory) return null
        return (
          <LevelsScreen
            category={selectedCategory}
            records={records}
            shareLinks={shareLinks}
            rankingPreviewLinks={rankingPreviewLinks}
            shortLinks={shortLinks}
            onBack={() => setScreen('categories')}
            onSelectLevel={(levelId) => openLevel(selectedCategory.id, levelId)}
            onShareLevel={handleGenerateShareLink}
            onCopyShareLink={handleCopyShareLink}
            onShareRankingPreview={handleShareRankingPreview}
            onShortenShareLink={handleShortenShareLink}
          />
        )

      case 'quiz':
        if (!activeLevel) return null
        return (
          <QuizScreen
            level={activeLevel}
            theme={activeTheme}
            isBlankMode={activeLevel.mode === 'blank'}
            isResponderMode={isResponderMode}
            responderName={responderName}
            responderAvatarDataUrl={responderAvatarDataUrl}
            answers={answers}
            corrected={corrected}
            results={results}
            uploadedImages={uploadedImages}
            onBack={() => setScreen('levels')}
            onResponderNameChange={setResponderName}
            onResponderAvatarUpload={handleResponderAvatarUpload}
            onAnswerChange={(questionId, value) => {
              if (corrected) return
              setAnswers((previous) => ({
                ...previous,
                [questionId]: value,
              }))
            }}
            onImageUpload={handleQuestionImageUpload}
            onCorrect={handleCorrect}
            onFinishLevel={handleFinishLevel}
          />
        )

      case 'levelResult':
        if (!selectedLevel || !selectedCategory || !activeRecord) return null
        return (
          <LevelResultScreen
            level={selectedLevel}
            levelNumber={selectedLevelIndex + 1}
            score={activeRecord.score}
            total={activeRecord.total}
            answers={activeRecord.answers}
            results={activeRecord.results}
            uploadedImages={uploadedImages}
            hasNextLevel={Boolean(selectedCategory.levels[selectedLevelIndex + 1])}
            frameRef={frameRef}
            sheetRef={sheetRef}
            onBackToLevels={() => setScreen('levels')}
            onNext={handleNextAfterLevel}
          />
        )

      case 'respondResult':
        if (!sharedQuiz || !sharedResult) return null
        return (
          <RespondResultScreen
            score={sharedResult.score}
            total={sharedResult.total}
            levelTitle={sharedQuiz.level.title}
            responderName={responderName}
            responderAvatarDataUrl={responderAvatarDataUrl}
            onResponderNameChange={setResponderName}
            onResponderAvatarUpload={handleResponderAvatarUpload}
            onBuildSubmissionLink={handleBuildSubmissionLink}
          />
        )

      case 'final':
        return (
          <FinalScreen
            score={categoryTotals.score}
            total={categoryTotals.total}
            badge={getBadge(finalPercent)}
            comment={getComment(finalPercent)}
            frameRef={frameRef}
            onPlayAgain={handlePlayAgain}
            onChangeCategory={() => {
              setSelectedLevelId('')
              setScreen('categories')
            }}
          />
        )

      case 'ranking':
        return (
          <RankingScreen
            entries={rankingEntries}
            isPreviewMode={isRankingPreviewMode}
            onBack={() => setScreen('home')}
            onClear={() => setRankings([])}
          />
        )

      default:
        return null
    }
  })()
  const showSidePanels = !isResponderMode && !isRankingPreviewMode
  const requiresAuth = hasRemote()
  const canAccessMode =
    !requiresAuth || (accessMode === 'admin' ? hasSession && isAdmin : hasSession)

  const protectedContent = (() => {
    if (!requiresAuth) {
      return screenContent
    }

    if (authLoading) {
      return (
        <section className="mt-6 flex flex-1 items-center justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">
            Carregando login...
          </p>
        </section>
      )
    }

    if (!hasSession) {
      return (
        <AuthScreen
          mode={accessMode}
          onGoogleLogin={() => void handleSocialLogin('google')}
          onAppleLogin={() => void handleSocialLogin('apple')}
        />
      )
    }

    if (accessMode === 'admin' && !isAdmin) {
      return (
        <AccessDeniedScreen email={session?.user.email} onSignOut={() => void handleSignOut()} />
      )
    }

    return screenContent
  })()

  return (
    <div
      className={`min-h-screen bg-[#080915] px-3 py-4 sm:px-6 ${
        showSidePanels ? '' : 'flex items-center justify-center'
      }`}
    >
      <div
        className={`mx-auto flex w-full flex-col gap-4 ${
          showSidePanels ? 'max-w-6xl lg:flex-row lg:items-start' : 'max-w-[460px]'
        }`}
      >
        <div className="w-full lg:max-w-[460px]">
          <Frame
            frameRef={frameRef}
            theme={activeTheme}
            backgroundImage={isResponderMode ? null : frameImage}
          >
            <Header
              title={headerTitle}
              subtitle={headerSubtitle}
              headerColor={activeTheme.headerColor}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="min-h-0 flex-1 overflow-hidden"
              >
                {protectedContent}
              </motion.div>
            </AnimatePresence>
          </Frame>
        </div>

        {showSidePanels && canAccessMode && (
          <div className="grid w-full max-w-md gap-4">
            {hasRemote() && hasSession && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
              >
                Sair ({session?.user.email})
              </button>
            )}
            <ConfigPanel
              title={config.title}
              subtitle={config.subtitle}
              themeId={config.themeId}
              themes={themes}
              onTitleChange={(value) => setConfig((previous) => ({ ...previous, title: value }))}
              onSubtitleChange={(value) =>
                setConfig((previous) => ({ ...previous, subtitle: value }))
              }
              onThemeChange={(themeId: ThemeId) =>
                setConfig((previous) => ({
                  ...previous,
                  themeId,
                }))
              }
              onBackgroundUpload={handleBackgroundUpload}
            />

            <BuilderPanel
              categories={categories}
              onAddCategory={handleAddCategory}
              onAddLevel={handleAddLevel}
              onUpdateQuestion={handleUpdateQuestion}
            />
          </div>
        )}
      </div>

      {!isResponderMode && !isRankingPreviewMode && canAccessMode && selectedLevel && (
        <div className="pointer-events-none fixed -left-[99999px] top-0">
          <div ref={sheetRef}>
            <AnswerSheet
              theme={activeTheme}
              title={config.title}
              subtitle={config.subtitle}
              level={selectedLevel}
              answers={activeRecord?.answers ?? answers}
              results={activeRecord?.results ?? results}
              imageOverrides={uploadedImages}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
