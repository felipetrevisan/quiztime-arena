import { useQuizApp } from '@/context/quiz-app-context'
import { PublishedQuizzesScreen } from '@/pages/PublishedQuizzesScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bea/play')({
  component: BeaPlayRoute,
})

function BeaPlayRoute() {
  const { categories, goHome, playPublishedLevel, rankingEntries, session } = useQuizApp()

  return (
    <PublishedQuizzesScreen
      categories={categories}
      rankings={rankingEntries}
      currentUserId={session?.user.id ?? null}
      onBack={goHome}
      onPlayLevel={playPublishedLevel}
    />
  )
}
