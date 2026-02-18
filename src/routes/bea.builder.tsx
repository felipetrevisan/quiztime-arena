import { useQuizApp } from '@/context/quiz-app-context'
import { themes } from '@/data/themes'
import { BuilderScreen } from '@/pages/BuilderScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bea/builder')({
  component: BeaBuilderRoute,
})

function BeaBuilderRoute() {
  const {
    categories,
    config,
    goHome,
    handleAddCategory,
    handleAddLevel,
    handleBackgroundUpload,
    handleGenerateQuestionChoices,
    handleQuestionImageUpload,
    handleSuggestQuestionImages,
    handleUpdateQuestion,
    setConfig,
  } = useQuizApp()

  return (
    <BuilderScreen
      title={config.title}
      subtitle={config.subtitle}
      themeId={config.themeId}
      themes={themes}
      categories={categories}
      onTitleChange={(value) => setConfig((previous) => ({ ...previous, title: value }))}
      onSubtitleChange={(value) => setConfig((previous) => ({ ...previous, subtitle: value }))}
      onThemeChange={(themeId) =>
        setConfig((previous) => ({
          ...previous,
          themeId,
        }))
      }
      onBackgroundUpload={handleBackgroundUpload}
      onAddCategory={handleAddCategory}
      onAddLevel={handleAddLevel}
      onUpdateQuestion={handleUpdateQuestion}
      onGenerateQuestionChoices={handleGenerateQuestionChoices}
      onSuggestQuestionImages={handleSuggestQuestionImages}
      onUploadQuestionImage={({ categoryId, levelId, questionId, file }) => {
        void handleQuestionImageUpload(questionId, file, { categoryId, levelId })
      }}
      onBack={goHome}
    />
  )
}
