import { useQuizApp } from '@/context/quiz-app-context'
import { HomeScreen } from '@/pages/HomeScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  const { goBuilder, goCategories, goMyQuizzes, goPlay, goRanking, hasSession, isAdmin } =
    useQuizApp()

  return (
    <HomeScreen
      isAdmin={isAdmin}
      canOpenPlay={hasSession}
      onStart={goCategories}
      onOpenPlay={goPlay}
      onOpenBuilder={goBuilder}
      onOpenRanking={goRanking}
      onOpenMyQuizzes={goMyQuizzes}
      canOpenMyQuizzes={hasSession}
    />
  )
}
