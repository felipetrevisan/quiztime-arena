import { useQuizApp } from '@/context/quiz-app-context'
import { QuizScreen } from '@/pages/QuizScreen'
import { createFileRoute } from '@tanstack/react-router'
import { toPng } from 'html-to-image'
import { useEffect } from 'react'

export const Route = createFileRoute('/bea/categories/$categoryId/levels/$levelId/quiz')({
  component: BeaQuizRoute,
})

function BeaQuizRoute() {
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
    isResponderMode,
    openLevel,
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
    if (accessMode !== 'admin') {
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
    isResponderMode,
    levelId,
    openLevel,
    selectedCategoryId,
    selectedLevelId,
  ])

  if (!levelToRender) {
    return null
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
