import { useQuizApp } from '@/context/quiz-app-context'
import { MyQuizzesScreen } from '@/pages/MyQuizzesScreen'
import { getSessionAliases } from '@/utils/user'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bea/my-quizzes')({
  component: BeaMyQuizzesRoute,
})

function BeaMyQuizzesRoute() {
  const { categories, goHome, goRanking, rankingEntries, session } = useQuizApp()
  const aliases = getSessionAliases(session)

  return (
    <MyQuizzesScreen
      categories={categories}
      entries={rankingEntries}
      currentUserId={session?.user.id ?? null}
      currentUserAliases={aliases}
      onBack={goHome}
      onOpenRanking={goRanking}
    />
  )
}
