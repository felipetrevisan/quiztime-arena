import { AnswerSheet } from '@/components/AnswerSheet'
import { BuilderPanel } from '@/components/BuilderPanel'
import { ConfigPanel } from '@/components/ConfigPanel'
import { Frame } from '@/components/Frame'
import { Header } from '@/components/Header'
import { initialCategories } from '@/data/levels'
import { themes } from '@/data/themes'
import { CategoriesScreen } from '@/pages/CategoriesScreen'
import { FinalScreen } from '@/pages/FinalScreen'
import { HomeScreen } from '@/pages/HomeScreen'
import { LevelResultScreen } from '@/pages/LevelResultScreen'
import { LevelsScreen } from '@/pages/LevelsScreen'
import { QuizScreen } from '@/pages/QuizScreen'
import { RankingScreen } from '@/pages/RankingScreen'
import { RespondResultScreen } from '@/pages/RespondResultScreen'
import type {
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
  const [shortLinks, setShortLinks] = useState<Record<string, string>>({})
  const [sharedQuiz, setSharedQuiz] = useState<ShareQuizPayload | null>(null)
  const [sharedResult, setSharedResult] = useState<{ score: number; total: number } | null>(null)
  const [responderName, setResponderName] = useState('')
  const [responderAvatarDataUrl, setResponderAvatarDataUrl] = useState<string | null>(null)
  const frameImageRef = useRef<string | null>(null)
  const uploadedImagesRef = useRef<Record<string, string>>({})

  const isResponderMode = Boolean(sharedQuiz)

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
    const params = new URLSearchParams(window.location.search)
    const importParam = params.get('import')
    const respondParam = params.get('respond')

    if (importParam) {
      const submission = decodePayload<ShareSubmissionPayload>(importParam)

      if (submission?.version === 1) {
        setRankings((previous) => {
          if (previous.some((entry) => entry.submissionId === submission.submissionId)) {
            return previous
          }
          return [submission, ...previous]
        })
        setScreen('ranking')
      }

      params.delete('import')
      const nextQuery = params.toString()
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
      window.history.replaceState(null, '', nextUrl)
      return
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
        setScreen('quiz')
      }
    }
  }, [setRankings, setSelectedCategoryId])

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

  const handleCorrect = () => {
    if (!activeLevel) return

    const evaluation: Record<string, boolean> = {}

    if (activeLevel.mode === 'blank') {
      for (const question of activeLevel.questions) {
        evaluation[question.id] = Boolean(answers[question.id]?.trim())
      }

      setResults(evaluation)
      setCorrected(true)
      return
    }

    for (const question of activeLevel.questions) {
      evaluation[question.id] = isAnswerCorrect(
        answers[question.id] ?? '',
        question.acceptedAnswers,
      )
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

  const handleQuestionImageUpload = (questionId: string, file: File) => {
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
  }

  const handleAddCategory = (category: Category) => {
    setCategories((previous) => {
      const uniqueId = getUniqueCategoryId(previous, category.id)
      const nextCategory = { ...category, id: uniqueId }
      return [...previous, nextCategory]
    })
  }

  const handleAddLevel = (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
  ) => {
    const newLevel = createEmptyLevel(levelTitle, levelDescription, mode)
    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) return category
        return {
          ...category,
          levels: [...category.levels, newLevel],
        }
      }),
    )
  }

  const handleGenerateShareLink = async (levelId: string) => {
    if (!selectedCategory) {
      return
    }

    const level = selectedCategory.levels.find((item) => item.id === levelId)
    if (!level) {
      return
    }

    const payload: ShareQuizPayload = {
      version: 1,
      quizId: `quiz-${crypto.randomUUID()}`,
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

    setShareLinks((previous) => ({
      ...previous,
      [levelKey(selectedCategory.id, level.id)]: shareLink,
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

  const handleBuildSubmissionLink = (): string => {
    if (!sharedQuiz || !sharedResult) {
      return ''
    }

    const safeName = responderName.trim()
    if (!safeName) {
      return ''
    }

    const payload: ShareSubmissionPayload = {
      version: 1,
      submissionId: `submission-${crypto.randomUUID()}`,
      quizId: sharedQuiz.quizId,
      responderName: safeName,
      responderAvatarDataUrl,
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
            shortLinks={shortLinks}
            onBack={() => setScreen('categories')}
            onSelectLevel={(levelId) => openLevel(selectedCategory.id, levelId)}
            onShareLevel={handleGenerateShareLink}
            onCopyShareLink={handleCopyShareLink}
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
            entries={rankings}
            onBack={() => setScreen('home')}
            onClear={() => setRankings([])}
          />
        )

      default:
        return null
    }
  })()

  const showSidePanels = !isResponderMode

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
                {screenContent}
              </motion.div>
            </AnimatePresence>
          </Frame>
        </div>

        {showSidePanels && (
          <div className="grid w-full max-w-md gap-4">
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
            />
          </div>
        )}
      </div>

      {!isResponderMode && selectedLevel && (
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
