import { useQuizApp } from '@/context/quiz-app-context'
import { QuizScreen } from '@/pages/QuizScreen'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/categories/$categoryId/levels/$levelId/quiz')({
  component: QuizRoute,
})

function QuizRoute() {
  const { categoryId, levelId } = Route.useParams()
  const {
    activeLevel,
    activeTheme,
    answers,
    corrected,
    goCategories,
    goHome,
    goLevels,
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
    setResponderName,
    updateAnswer,
    uploadedImages,
  } = useQuizApp()

  useEffect(() => {
    if (!isResponderMode && (selectedCategoryId !== categoryId || selectedLevelId !== levelId)) {
      openLevel(categoryId, levelId)
    }
  }, [categoryId, isResponderMode, levelId, openLevel, selectedCategoryId, selectedLevelId])

  if (!activeLevel) {
    return null
  }

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
      onBack={() => {
        if (isResponderMode) {
          goHome()
          return
        }

        if (selectedCategory) {
          goLevels(selectedCategory.id)
          return
        }

        goCategories()
      }}
      onResponderNameChange={setResponderName}
      onResponderAvatarUpload={handleResponderAvatarUpload}
      onAnswerChange={updateAnswer}
      onImageUpload={(questionId, file) => {
        void handleQuestionImageUpload(questionId, file)
      }}
      onCorrect={handleCorrect}
      onFinishLevel={handleFinishLevel}
    />
  )
}
