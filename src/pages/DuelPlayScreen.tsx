import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuizApp } from '@/context/quiz-app-context'
import {
  fetchRemoteDuelEntries,
  fetchRemoteDuelSession,
  finalizeRemoteDuelSubmission,
  joinRemoteDuelSession,
  upsertRemoteDuelDraft,
} from '@/services/supabase'
import type { DuelEntry, DuelSession, Level } from '@/types/quiz'
import { shouldShowQuestionImage } from '@/utils/question-image'
import { formatDuration } from '@/utils/scoring'
import { copyText } from '@/utils/share'
import { supabase } from '@/utils/supabase'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface DuelPlayScreenProps {
  sessionId: string
  isBeaScoped: boolean
  onBack: () => void
}

interface DuelPresence {
  typing: boolean
  answeredCount: number
  currentQuestion: number
  displayName: string
  isSubmitted: boolean
}

const getSessionProfile = (session: Session) => {
  const metadata = session.user.user_metadata as Record<string, unknown> | undefined
  const name =
    (typeof metadata?.name === 'string' && metadata.name) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    session.user.email ||
    'Jogador'
  const avatar =
    (typeof metadata?.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata?.picture === 'string' && metadata.picture) ||
    null

  return {
    displayName: name.trim() || 'Jogador',
    avatarUrl: avatar?.trim() || null,
  }
}

const getLevelFromSession = (
  session: DuelSession | null,
  categories: ReturnType<typeof useQuizApp>['categories'],
): Level | null => {
  if (!session) return null
  const category = categories.find((item) => item.id === session.categoryId)
  return category?.levels.find((level) => level.id === session.levelId) ?? null
}

export const DuelPlayScreen = ({ sessionId, isBeaScoped, onBack }: DuelPlayScreenProps) => {
  const { categories, session } = useQuizApp()
  const [duelSession, setDuelSession] = useState<DuelSession | null>(null)
  const [entries, setEntries] = useState<DuelEntry[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [typing, setTyping] = useState(false)
  const [presenceByUser, setPresenceByUser] = useState<Record<string, DuelPresence>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const hasHydratedRef = useRef(false)

  const level = useMemo(
    () => getLevelFromSession(duelSession, categories),
    [duelSession, categories],
  )
  const myUserId = session?.user.id ?? null
  const meEntry = useMemo(
    () => entries.find((entry) => entry.userId === myUserId) ?? null,
    [entries, myUserId],
  )
  const rivalEntry = useMemo(
    () => entries.find((entry) => entry.userId !== myUserId) ?? null,
    [entries, myUserId],
  )

  const answeredCount = useMemo(() => {
    if (!level) {
      return Object.values(answers).filter((value) => value.trim().length > 0).length
    }

    return level.questions.filter((question) => Boolean(answers[question.id]?.trim())).length
  }, [answers, level])

  const totalQuestions = level?.questions.length ?? 0
  const clampedQuestionIndex = Math.max(
    0,
    Math.min(currentQuestionIndex, Math.max(totalQuestions - 1, 0)),
  )
  const currentQuestion = level?.questions[clampedQuestionIndex] ?? null
  const isChoiceMode = level?.answerMode === 'choices' && level?.mode !== 'blank'
  const canAnswer = duelSession?.status === 'running' && !meEntry?.isSubmitted
  const isHost = Boolean(myUserId && duelSession?.hostUserId === myUserId)
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}${isBeaScoped ? '/bea' : ''}/play?duel=${encodeURIComponent(sessionId)}`
      : ''

  const refreshDuelState = useCallback(async () => {
    const [nextSession, nextEntries] = await Promise.all([
      fetchRemoteDuelSession(sessionId),
      fetchRemoteDuelEntries(sessionId),
    ])

    if (nextSession) {
      setDuelSession(nextSession)
    }
    if (nextEntries) {
      setEntries(nextEntries)
    }
  }, [sessionId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      setError('Faça login para entrar no duelo.')
      return
    }

    let active = true
    hasHydratedRef.current = false
    setLoading(true)
    setError(null)

    const profile = getSessionProfile(session)

    void (async () => {
      const joined = await joinRemoteDuelSession({
        sessionId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      })

      if (!active) return

      if (!joined) {
        setError('Nao foi possivel entrar nessa partida. Talvez ela esteja cheia ou encerrada.')
        setLoading(false)
        return
      }

      setDuelSession(joined)
      const nextEntries = await fetchRemoteDuelEntries(sessionId)
      if (!active) return

      if (nextEntries) {
        setEntries(nextEntries)
      }
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [session, sessionId])

  useEffect(() => {
    if (!level || !meEntry || hasHydratedRef.current) {
      return
    }

    setAnswers(meEntry.answers ?? {})
    setCurrentQuestionIndex(Math.max(0, (meEntry.currentQuestion ?? 1) - 1))
    hasHydratedRef.current = true
  }, [level, meEntry])

  useEffect(() => {
    if (!supabase || !session || !myUserId) {
      return
    }

    const channel = supabase
      .channel(`duel-room:${sessionId}`, {
        config: { presence: { key: myUserId } },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duel_sessions', filter: `id=eq.${sessionId}` },
        () => {
          void refreshDuelState()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duel_entries',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void refreshDuelState()
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const next: Record<string, DuelPresence> = {}
        for (const [userId, metas] of Object.entries(state)) {
          const meta = Array.isArray(metas) ? (metas[0] as Record<string, unknown>) : null
          if (!meta) continue

          next[userId] = {
            typing: Boolean(meta.typing),
            answeredCount: Number(meta.answeredCount ?? 0),
            currentQuestion: Number(meta.currentQuestion ?? 1),
            displayName: String(meta.displayName ?? 'Jogador'),
            isSubmitted: Boolean(meta.isSubmitted),
          }
        }
        setPresenceByUser(next)
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return
        const profile = getSessionProfile(session)
        void channel.track({
          typing: false,
          answeredCount: 0,
          currentQuestion: 1,
          displayName: profile.displayName,
          isSubmitted: false,
        })
      })

    channelRef.current = channel

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
      }
      void channel.unsubscribe()
      channelRef.current = null
    }
  }, [myUserId, refreshDuelState, session, sessionId])

  useEffect(() => {
    if (!channelRef.current || !session) {
      return
    }

    void channelRef.current.track({
      typing,
      answeredCount,
      currentQuestion: clampedQuestionIndex + 1,
      displayName: meEntry?.displayName ?? getSessionProfile(session).displayName,
      isSubmitted: Boolean(meEntry?.isSubmitted),
    })
  }, [
    answeredCount,
    clampedQuestionIndex,
    meEntry?.displayName,
    meEntry?.isSubmitted,
    session,
    typing,
  ])

  useEffect(() => {
    if (
      !duelSession ||
      !myUserId ||
      !meEntry ||
      !hasHydratedRef.current ||
      duelSession.status === 'finished' ||
      duelSession.status === 'cancelled'
    ) {
      return
    }

    const timeout = window.setTimeout(() => {
      void upsertRemoteDuelDraft({
        sessionId: duelSession.id,
        answers,
        answeredCount,
        currentQuestion: clampedQuestionIndex + 1,
      })
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [answers, answeredCount, clampedQuestionIndex, duelSession, meEntry, myUserId])

  const rivalPresence = useMemo(() => {
    if (!rivalEntry) return null
    return presenceByUser[rivalEntry.userId] ?? null
  }, [presenceByUser, rivalEntry])

  const mePresence = useMemo(() => {
    if (!myUserId) return null
    return presenceByUser[myUserId] ?? null
  }, [myUserId, presenceByUser])

  const handleAnswerChange = (value: string) => {
    if (!canAnswer || !currentQuestion) {
      return
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: value,
    }))

    setTyping(true)
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      setTyping(false)
    }, 900)
  }

  const handleFinalize = async () => {
    if (!duelSession || !session || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)
    const profile = getSessionProfile(session)

    const finalized = await finalizeRemoteDuelSubmission({
      sessionId: duelSession.id,
      answers,
      answeredCount,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    })

    if (!finalized) {
      setError('Nao foi possivel finalizar o duelo.')
      setSubmitting(false)
      return
    }

    setDuelSession(finalized.session)
    setEntries(finalized.entries)
    setTyping(false)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Entrando na partida...
        </p>
      </section>
    )
  }

  if (error || !duelSession || !session || !myUserId) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-rose-100">{error ?? 'Partida indisponivel.'}</p>
        <Button type="button" onClick={onBack}>
          Voltar
        </Button>
      </section>
    )
  }

  const winnerEntry = entries.find((entry) => entry.userId === duelSession.winnerUserId) ?? null
  const meAnsweredCount = mePresence?.answeredCount ?? meEntry?.answeredCount ?? answeredCount
  const rivalAnsweredCount = rivalPresence?.answeredCount ?? rivalEntry?.answeredCount ?? 0
  const rivalCurrentQuestion = rivalPresence?.currentQuestion ?? rivalEntry?.currentQuestion ?? 1
  const rivalTyping = Boolean(rivalPresence?.typing) && duelSession.status === 'running'
  const finished = duelSession.status === 'finished'
  const rankingRows = [...entries].sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score
    return left.durationMs - right.durationMs
  })

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-100/90">
            Duelo em tempo real
          </p>
          <h2 className="font-display text-base font-bold uppercase tracking-[0.12em] text-white">
            {level?.title ?? 'Carregando quiz'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <article className="rounded-2xl border border-emerald-300/30 bg-emerald-500/15 p-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100/90">
            Voce
          </p>
          <p className="mt-1 text-xs font-semibold text-white">
            {meEntry?.displayName ?? getSessionProfile(session).displayName}
          </p>
          <p className="mt-1 text-[10px] text-white/80">
            Progresso: {meAnsweredCount}/{Math.max(totalQuestions, 1)}
          </p>
          <p className="text-[10px] text-white/80">
            Pergunta: {Math.max(1, clampedQuestionIndex + 1)}
          </p>
          {meEntry?.isSubmitted && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100">
              Finalizado
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/15 p-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-100/90">Rival</p>
          <p className="mt-1 text-xs font-semibold text-white">
            {rivalEntry?.displayName ?? rivalPresence?.displayName ?? 'Aguardando...'}
          </p>
          <p className="mt-1 text-[10px] text-white/80">
            Progresso: {rivalAnsweredCount}/{Math.max(totalQuestions, 1)}
          </p>
          <p className="text-[10px] text-white/80">Pergunta: {Math.max(1, rivalCurrentQuestion)}</p>
          {rivalTyping && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-100">
              Digitando...
            </p>
          )}
          {rivalEntry?.isSubmitted && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-100">
              Finalizado
            </p>
          )}
        </article>
      </div>

      {duelSession.status === 'waiting' && (
        <div className="mt-3 rounded-2xl border border-white/20 bg-black/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
            {isHost ? 'Convide seu rival com este link:' : 'Aguardando o host iniciar a partida...'}
          </p>
          {isHost && (
            <>
              <Input value={inviteLink} readOnly className="mt-2 text-xs" />
              <Button
                type="button"
                onClick={async () => {
                  const copied = await copyText(inviteLink)
                  setCopyFeedback(copied ? 'Link copiado.' : 'Nao foi possivel copiar o link.')
                }}
                className="mt-2 w-full"
              >
                Copiar link do duelo
              </Button>
              {copyFeedback && (
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-100/90">
                  {copyFeedback}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {duelSession.status === 'running' && level && currentQuestion && (
        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/20 bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
              Pergunta {clampedQuestionIndex + 1}/{totalQuestions}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100/80">
              {level.timingMode === 'speedrun' ? 'Speed Run' : 'Timeless'}
            </p>
          </div>

          <div className="h-[calc(100%-94px)] overflow-y-auto">
            <div className="rounded-xl border border-white/20 bg-black/35 p-3">
              {shouldShowQuestionImage({
                imagePath: currentQuestion.imagePath,
                hideDefaultQuestionImage: level.hideDefaultQuestionImage ?? true,
              }) && (
                <img
                  src={currentQuestion.imagePath}
                  alt="Imagem da pergunta"
                  className="h-36 w-full rounded-xl border border-white/20 object-cover"
                />
              )}
              <p className="mt-2 text-sm font-semibold text-white">
                {currentQuestion.question || currentQuestion.prompt}
              </p>

              {isChoiceMode ? (
                <div className="mt-3 space-y-2">
                  {(currentQuestion.options ?? []).map((option, optionIndex) => {
                    const selected = (answers[currentQuestion.id] ?? '') === option
                    return (
                      <button
                        key={`${currentQuestion.id}:${optionIndex}`}
                        type="button"
                        onClick={() => handleAnswerChange(option)}
                        disabled={!canAnswer}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? 'border-cyan-200/60 bg-cyan-500/25 text-cyan-100'
                            : 'border-white/20 bg-black/25 text-white/85'
                        } ${!canAnswer ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Input
                  value={answers[currentQuestion.id] ?? ''}
                  onChange={(event) => handleAnswerChange(event.target.value)}
                  disabled={!canAnswer}
                  placeholder="Digite sua resposta"
                  className="mt-3"
                />
              )}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={clampedQuestionIndex === 0 || !canAnswer}
              onClick={() => setCurrentQuestionIndex((previous) => Math.max(0, previous - 1))}
            >
              Anterior
            </Button>
            {clampedQuestionIndex < Math.max(totalQuestions - 1, 0) ? (
              <Button
                type="button"
                disabled={!canAnswer}
                onClick={() =>
                  setCurrentQuestionIndex((previous) =>
                    Math.min(Math.max(totalQuestions - 1, 0), previous + 1),
                  )
                }
                className="flex-1"
              >
                Proxima
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canAnswer || submitting}
                onClick={() => void handleFinalize()}
                className="flex-1"
              >
                {submitting ? 'Finalizando...' : 'Finalizar duelo'}
              </Button>
            )}
          </div>
        </div>
      )}

      {duelSession.status === 'running' && !level && (
        <div className="mt-3 rounded-2xl border border-white/20 bg-black/30 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
            Carregando perguntas do duelo...
          </p>
        </div>
      )}

      {finished && (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/20 bg-black/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            Resultado final
          </p>
          <h3 className="mt-1 text-sm font-bold text-white">
            {winnerEntry ? `Vencedor: ${winnerEntry.displayName}` : 'Empate tecnico'}
          </h3>
          <p className="mt-1 text-[11px] text-white/75">
            Criterio: maior acerto, depois menor tempo.
          </p>

          <div className="mt-3 space-y-2">
            {rankingRows.map((entry, index) => (
              <article
                key={entry.userId}
                className={`rounded-xl border p-3 ${
                  entry.userId === duelSession.winnerUserId
                    ? 'border-emerald-300/40 bg-emerald-500/20'
                    : 'border-white/20 bg-black/25'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  #{index + 1}
                </p>
                <p className="text-sm font-bold text-white">{entry.displayName}</p>
                <p className="text-[11px] text-white/80">
                  {entry.score}/{entry.total} acertos • {formatDuration(entry.durationMs)}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-rose-100">
          {error}
        </p>
      )}
    </section>
  )
}
