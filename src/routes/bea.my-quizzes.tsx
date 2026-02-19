import { useQuizApp } from '@/context/quiz-app-context'
import { MyQuizzesScreen } from '@/pages/MyQuizzesScreen'
import { fetchRemoteMyDuelHistory } from '@/services/supabase'
import type { DuelHistoryMatch } from '@/types/quiz'
import { notifyError } from '@/utils/feedback'
import { getSessionAliases } from '@/utils/user'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/bea/my-quizzes')({
  component: BeaMyQuizzesRoute,
})

function BeaMyQuizzesRoute() {
  const { categories, goHome, goRanking, rankingEntries, requiresAuth, session } = useQuizApp()
  const aliases = getSessionAliases(session)
  const [duelHistory, setDuelHistory] = useState<DuelHistoryMatch[]>([])
  const [duelHistoryLoading, setDuelHistoryLoading] = useState(false)

  useEffect(() => {
    if (!requiresAuth || !session?.user.id) {
      setDuelHistory([])
      setDuelHistoryLoading(false)
      return
    }

    let active = true
    setDuelHistoryLoading(true)

    void (async () => {
      const history = await fetchRemoteMyDuelHistory(session.user.id)
      if (!active) {
        return
      }

      if (!history) {
        notifyError('Nao foi possivel carregar seu historico de duelos.')
        setDuelHistory([])
      } else {
        setDuelHistory(history)
      }

      setDuelHistoryLoading(false)
    })()

    return () => {
      active = false
    }
  }, [requiresAuth, session?.user.id])

  return (
    <MyQuizzesScreen
      categories={categories}
      entries={rankingEntries}
      duelHistory={duelHistory}
      duelHistoryLoading={duelHistoryLoading}
      currentUserId={session?.user.id ?? null}
      currentUserAliases={aliases}
      onBack={goHome}
      onOpenRanking={goRanking}
    />
  )
}
