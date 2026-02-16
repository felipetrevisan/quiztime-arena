import { useQuizApp } from '@/context/quiz-app-context'
import { MyQuizzesScreen } from '@/pages/MyQuizzesScreen'
import { getSessionAliases } from '@/utils/user'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/my-quizzes')({
  component: MyQuizzesRoute,
})

function MyQuizzesRoute() {
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
