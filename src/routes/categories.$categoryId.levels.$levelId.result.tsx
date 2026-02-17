import { LevelSummarySheet } from '@/components/LevelSummarySheet'
import { useQuizApp } from '@/context/quiz-app-context'
import { LevelResultScreen } from '@/pages/LevelResultScreen'
import { createFileRoute } from '@tanstack/react-router'
import { useRef } from 'react'

export const Route = createFileRoute('/categories/$categoryId/levels/$levelId/result')({
  component: LevelResultRoute,
})

function LevelResultRoute() {
  const {
    activeTheme,
    activeRecord,
    config,
    frameRef,
    goLevels,
    handleNextAfterLevel,
    selectedCategory,
    selectedLevel,
    selectedLevelIndex,
    sheetRef,
    uploadedImages,
  } = useQuizApp()
  const summaryRef = useRef<HTMLDivElement>(null)

  if (!selectedLevel || !selectedCategory || !activeRecord) {
    return null
  }

  return (
    <>
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
        summaryRef={summaryRef}
        onBackToLevels={() => goLevels(selectedCategory.id)}
        onNext={handleNextAfterLevel}
      />

      <div className="pointer-events-none fixed -left-[99999px] top-0">
        <div ref={summaryRef}>
          <LevelSummarySheet
            theme={activeTheme}
            title={config.title}
            subtitle={config.subtitle}
            level={selectedLevel}
            score={activeRecord.score}
            total={activeRecord.total}
            answers={activeRecord.answers}
            results={activeRecord.results}
            imageOverrides={uploadedImages}
          />
        </div>
      </div>
    </>
  )
}
