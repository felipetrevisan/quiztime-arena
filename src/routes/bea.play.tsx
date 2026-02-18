import { useQuizApp } from '@/context/quiz-app-context'
import { DuelPlayScreen } from '@/pages/DuelPlayScreen'
import { PublishedQuizzesScreen } from '@/pages/PublishedQuizzesScreen'
import { createRemoteDuelSession } from '@/services/supabase'
import { notifyError, notifyInfo, notifySuccess } from '@/utils/feedback'
import { copyText } from '@/utils/share'
import { createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

export const Route = createFileRoute('/bea/play')({
  component: BeaPlayRoute,
})

function BeaPlayRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const { categories, goHome, playPublishedLevel, rankingEntries, session } = useQuizApp()
  const [creatingDuelKey, setCreatingDuelKey] = useState<string | null>(null)
  const duelId = useMemo(() => {
    const query = new URLSearchParams(location.searchStr)
    return query.get('duel')?.trim() ?? ''
  }, [location.searchStr])

  const createDuel = async (categoryId: string, levelId: string) => {
    if (!session) {
      notifyError('Faca login para criar um duelo.')
      return
    }

    const key = `${categoryId}:${levelId}`
    setCreatingDuelKey(key)
    const metadata = session.user.user_metadata as Record<string, unknown> | undefined
    const displayName =
      (typeof metadata?.name === 'string' && metadata.name) ||
      (typeof metadata?.full_name === 'string' && metadata.full_name) ||
      session.user.email ||
      'Jogador'
    const avatarUrl =
      (typeof metadata?.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata?.picture === 'string' && metadata.picture) ||
      null

    const duelSessionId = await createRemoteDuelSession({
      quizId: `duel-${categoryId}-${levelId}-${crypto.randomUUID().slice(0, 8)}`,
      categoryId,
      levelId,
      displayName: displayName.trim() || 'Jogador',
      avatarUrl,
    })

    if (duelSessionId) {
      const duelLink = `${window.location.origin}/bea/play?duel=${encodeURIComponent(duelSessionId)}`
      const copied = await copyText(duelLink)
      if (copied) {
        notifySuccess('Link do duelo copiado.')
      } else {
        notifyInfo('Duelo criado. Copie o link manualmente.')
      }
      window.location.assign(`/bea/play?duel=${encodeURIComponent(duelSessionId)}`)
    } else {
      notifyError('Nao foi possivel criar o duelo. Tente novamente.')
    }

    setCreatingDuelKey(null)
  }

  if (duelId) {
    return (
      <DuelPlayScreen
        sessionId={duelId}
        isBeaScoped
        onBack={() => {
          void navigate({ to: '/bea/play' })
        }}
      />
    )
  }

  return (
    <PublishedQuizzesScreen
      categories={categories}
      rankings={rankingEntries}
      currentUserId={session?.user.id ?? null}
      onBack={goHome}
      onPlayLevel={playPublishedLevel}
      onCreateDuel={createDuel}
      creatingDuelKey={creatingDuelKey}
    />
  )
}
