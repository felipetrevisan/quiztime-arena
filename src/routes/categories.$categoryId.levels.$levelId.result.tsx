import { useQuizApp } from '@/context/quiz-app-context'
import { LevelResultScreen } from '@/pages/LevelResultScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/categories/$categoryId/levels/$levelId/result')({
  component: LevelResultRoute,
})

function LevelResultRoute() {
  const {
    activeRecord,
    frameRef,
    goLevels,
    handleNextAfterLevel,
    selectedCategory,
    selectedLevel,
    selectedLevelIndex,
    sheetRef,
    uploadedImages,
  } = useQuizApp()

  if (!selectedLevel || !selectedCategory || !activeRecord) {
    return null
  }

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
      onBackToLevels={() => goLevels(selectedCategory.id)}
      onNext={handleNextAfterLevel}
    />
  )
}
