import { useQuizApp } from '@/context/quiz-app-context'
import { QuizScreen } from '@/pages/QuizScreen'
import { createFileRoute } from '@tanstack/react-router'
import { toPng } from 'html-to-image'
import { useEffect } from 'react'

export const Route = createFileRoute('/categories/$categoryId/levels/$levelId/quiz')({
  component: QuizRoute,
})

function QuizRoute() {
  const { categoryId, levelId } = Route.useParams()
  const {
    accessMode,
    activeLevel,
    activeTheme,
    answers,
    categories,
    corrected,
    frameRef,
    goCategories,
    goHome,
    goLevels,
    goPlay,
    handleCorrect,
    handleFinishLevel,
    handleQuestionImageUpload,
    handleResponderAvatarUpload,
    isAdmin,
    isResponderMode,
    openLevel,
    playPublishedLevel,
    responderAvatarDataUrl,
    responderName,
    results,
    selectedCategory,
    selectedCategoryId,
    selectedLevelId,
    setSharedQuiz,
    setResponderName,
    sharedQuiz,
    updateAnswer,
    uploadedImages,
  } = useQuizApp()

  const routeCategory = categories.find((category) => category.id === categoryId) ?? null
  const routeLevel = routeCategory?.levels.find((level) => level.id === levelId) ?? null
  const levelToRender = isResponderMode ? activeLevel : (routeLevel ?? activeLevel)
  const isPublishedPlayMode = Boolean(sharedQuiz?.quizId.startsWith('published-'))

  useEffect(() => {
    if (accessMode !== 'admin' || !isAdmin) {
      return
    }

    if (
      !isResponderMode &&
      (selectedCategoryId !== categoryId || selectedLevelId !== levelId || !activeLevel)
    ) {
      openLevel(categoryId, levelId)
    }
  }, [
    activeLevel,
    accessMode,
    categoryId,
    isAdmin,
    isResponderMode,
    levelId,
    openLevel,
    selectedCategoryId,
    selectedLevelId,
  ])

  useEffect(() => {
    if (isAdmin || isResponderMode || !routeCategory || !routeLevel?.isPublished) {
      return
    }

    const expectedQuizId = `published-${routeCategory.id}-${routeLevel.id}`
    if (sharedQuiz?.quizId === expectedQuizId) {
      return
    }

    playPublishedLevel(routeCategory.id, routeLevel.id)
  }, [isAdmin, isResponderMode, playPublishedLevel, routeCategory, routeLevel, sharedQuiz?.quizId])

  if (!levelToRender) {
    return (
      <section className="flex h-full min-h-0 flex-1 items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Carregando nivel...
        </p>
      </section>
    )
  }

  const handleTakeScreenshot = async () => {
    if (!frameRef.current) {
      return
    }

    try {
      const dataUrl = await toPng(frameRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      })

      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `quiztime-resposta-${levelId}.png`
      anchor.click()
    } catch (error) {
      console.error('Erro ao gerar screenshot do quiz', error)
    }
  }

  return (
    <QuizScreen
      level={levelToRender}
      theme={activeTheme}
      timingMode={levelToRender.timingMode ?? 'timeless'}
      isBlankMode={levelToRender.mode === 'blank'}
      isResponderMode={isResponderMode}
      responderName={responderName}
      responderAvatarDataUrl={responderAvatarDataUrl}
      answers={answers}
      corrected={corrected}
      results={results}
      uploadedImages={uploadedImages}
      onBack={() => {
        if (isResponderMode) {
          if (isPublishedPlayMode) {
            setSharedQuiz(null)
            goPlay()
            return
          }

          goHome()
          return
        }

        if (selectedCategory) {
          goLevels(selectedCategory.id)
          return
        }

        if (routeCategory) {
          goLevels(routeCategory.id)
          return
        }

        goCategories()
      }}
      onResponderNameChange={setResponderName}
      onResponderAvatarUpload={handleResponderAvatarUpload}
      showResponderExit={isPublishedPlayMode}
      backButtonLabel={isPublishedPlayMode ? 'Sair e continuar depois' : 'Sair'}
      onAnswerChange={updateAnswer}
      onImageUpload={(questionId, file) => {
        void handleQuestionImageUpload(questionId, file)
      }}
      onCorrect={handleCorrect}
      onFinishLevel={handleFinishLevel}
      onTakeScreenshot={handleTakeScreenshot}
    />
  )
}
