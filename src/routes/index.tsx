import { useQuizApp } from '@/context/quiz-app-context'
import { HomeScreen } from '@/pages/HomeScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  const { goBuilder, goCategories, goRanking } = useQuizApp()

  return <HomeScreen onStart={goCategories} onOpenBuilder={goBuilder} onOpenRanking={goRanking} />
}
