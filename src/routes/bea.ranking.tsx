import { useQuizApp } from '@/context/quiz-app-context'
import { mergeRankings } from '@/hooks/quiz/shared'
import { RankingScreen } from '@/pages/RankingScreen'
import { fetchRemoteRankings } from '@/services/supabase'
import { getSessionAliases } from '@/utils/user'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/bea/ranking')({
  component: BeaRankingRoute,
})

function BeaRankingRoute() {
  const {
    goHome,
    hasSession,
    isRankingPreviewMode,
    rankingEntries,
    requiresAuth,
    session,
    setRankings,
  } = useQuizApp()
  const aliases = getSessionAliases(session)

  useEffect(() => {
    if (!requiresAuth || !hasSession) {
      return
    }

    let active = true

    void (async () => {
      const remoteRankings = await fetchRemoteRankings()
      if (!active || !remoteRankings || remoteRankings.length === 0) {
        return
      }

      setRankings((previous) => mergeRankings(previous, remoteRankings))
    })()

    return () => {
      active = false
    }
  }, [hasSession, requiresAuth, setRankings])

  return (
    <RankingScreen
      entries={rankingEntries}
      isPreviewMode={isRankingPreviewMode}
      currentUserId={session?.user.id ?? null}
      currentUserAliases={aliases}
      onBack={goHome}
      onClear={() => setRankings([])}
    />
  )
}
