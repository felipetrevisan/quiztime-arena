import type { Category, DuelHistoryMatch, RankingEntry } from '@/types/quiz'
import { formatDuration } from '@/utils/scoring'
import { useMemo } from 'react'

interface MyQuizzesScreenProps {
  categories: Category[]
  entries: RankingEntry[]
  duelHistory: DuelHistoryMatch[]
  duelHistoryLoading?: boolean
  currentUserId: string | null
  currentUserAliases?: string[]
  onBack: () => void
  onOpenRanking: () => void
}

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const normalizeIdentity = (value: string): string => value.trim().toLowerCase()

const getEntryQuestions = (categories: Category[], entry: RankingEntry) => {
  const category = categories.find((item) => item.title === entry.categoryTitle)
  const level = category?.levels.find((item) => item.title === entry.levelTitle)

  const orderedQuestionIds =
    level?.questions.map((question) => question.id) ?? Object.keys(entry.answers)

  return orderedQuestionIds.map((questionId, index) => {
    const question = level?.questions.find((item) => item.id === questionId)
    const answer = entry.answers[questionId] ?? ''
    const correct = entry.results[questionId] ?? false
    const baseLabel = level?.mode === 'blank' ? `Alternativa ${index + 1}` : `Pergunta ${index + 1}`
    const questionText = question?.question || question?.prompt || ''
    const questionLabel = questionText.trim() ? questionText : baseLabel

    return {
      questionId,
      questionLabel,
      answer,
      correct,
    }
  })
}

export const MyQuizzesScreen = ({
  categories,
  entries,
  duelHistory,
  duelHistoryLoading = false,
  currentUserId,
  currentUserAliases = [],
  onBack,
  onOpenRanking,
}: MyQuizzesScreenProps) => {
  const userEntries = useMemo(() => {
    if (!currentUserId && currentUserAliases.length === 0) {
      return []
    }

    const aliasSet = new Set(currentUserAliases.map(normalizeIdentity))

    return entries
      .filter((entry) => {
        if (currentUserId && entry.userId === currentUserId) {
          return true
        }

        if (!entry.userId && aliasSet.size > 0) {
          return aliasSet.has(normalizeIdentity(entry.responderName))
        }

        return false
      })
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
      )
  }, [currentUserAliases, currentUserId, entries])

  const groupedByQuiz = useMemo(() => {
    const byQuiz = new Map<string, RankingEntry[]>()

    for (const entry of userEntries) {
      const current = byQuiz.get(entry.quizId) ?? []
      current.push(entry)
      byQuiz.set(entry.quizId, current)
    }

    return [...byQuiz.entries()].map(([quizId, quizEntries]) => ({
      quizId,
      categoryTitle: quizEntries[0]?.categoryTitle ?? 'Quiz',
      entries: quizEntries,
    }))
  }, [userEntries])

  const summary = useMemo(() => {
    const uniqueQuizCount = new Set(userEntries.map((entry) => entry.quizId)).size
    const totalCorrect = userEntries.reduce((acc, entry) => acc + entry.score, 0)
    const totalQuestions = userEntries.reduce((acc, entry) => acc + entry.total, 0)
    const totalSpeedPoints = userEntries
      .filter((entry) => entry.playMode === 'speedrun')
      .reduce((acc, entry) => acc + (entry.points ?? entry.score), 0)

    return {
      uniqueQuizCount,
      playedLevels: userEntries.length,
      totalCorrect,
      totalQuestions,
      totalSpeedPoints,
    }
  }, [userEntries])

  const duelSummary = useMemo(() => {
    const finished = duelHistory.filter((item) => item.session.status === 'finished')
    const wins = finished.filter((item) => item.session.winnerUserId === item.me.userId).length
    const losses = finished.filter(
      (item) => item.rival && item.session.winnerUserId === item.rival.userId,
    ).length
    const draws = Math.max(0, finished.length - wins - losses)

    return {
      total: duelHistory.length,
      finished: finished.length,
      wins,
      losses,
      draws,
    }
  }, [duelHistory])

  const duelRows = useMemo(() => {
    return duelHistory.map((item) => {
      const category = categories.find((entry) => entry.id === item.session.categoryId) ?? null
      const level = category?.levels.find((entry) => entry.id === item.session.levelId) ?? null
      const playedAt = item.session.finishedAt ?? item.me.submittedAt ?? item.session.createdAt

      const resultLabel =
        item.session.status !== 'finished'
          ? 'Em andamento'
          : item.session.winnerUserId === item.me.userId
            ? 'Vitoria'
            : item.rival && item.session.winnerUserId === item.rival.userId
              ? 'Derrota'
              : 'Empate'

      const resultClassName =
        resultLabel === 'Vitoria'
          ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
          : resultLabel === 'Derrota'
            ? 'border-rose-300/40 bg-rose-500/20 text-rose-100'
            : resultLabel === 'Empate'
              ? 'border-amber-300/40 bg-amber-500/20 text-amber-100'
              : 'border-cyan-300/40 bg-cyan-500/20 text-cyan-100'

      return {
        sessionId: item.session.id,
        categoryTitle: category?.title ?? item.session.categoryId,
        levelTitle: level?.title ?? item.session.levelId,
        rivalName: item.rival?.displayName ?? 'Aguardando rival',
        playedAt,
        resultLabel,
        resultClassName,
        meScoreText: `${item.me.score}/${item.me.total}`,
        meDurationText: formatDuration(item.me.durationMs),
        rivalScoreText: item.rival ? `${item.rival.score}/${item.rival.total}` : '-',
        rivalDurationText: item.rival ? formatDuration(item.rival.durationMs) : '-',
      }
    })
  }, [categories, duelHistory])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-white">
          Meus quizzes
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/25 bg-black/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
            Quizzes jogados
          </p>
          <p className="mt-1 text-lg font-black text-white">{summary.uniqueQuizCount}</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-black/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
            Niveis respondidos
          </p>
          <p className="mt-1 text-lg font-black text-white">{summary.playedLevels}</p>
        </div>
        <div className="rounded-xl border border-white/25 bg-black/30 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
            Acertos totais
          </p>
          <p className="mt-1 text-lg font-black text-white">
            {summary.totalCorrect}/{summary.totalQuestions}
          </p>
        </div>
        <div className="rounded-xl border border-amber-300/30 bg-amber-500/15 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">
            Speed run points
          </p>
          <p className="mt-1 text-lg font-black text-amber-100">{summary.totalSpeedPoints}</p>
        </div>
        <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-100">
            Duelos jogados
          </p>
          <p className="mt-1 text-lg font-black text-fuchsia-100">{duelSummary.total}</p>
        </div>
        <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-500/15 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-100">
            Vitorias nos duelos
          </p>
          <p className="mt-1 text-lg font-black text-fuchsia-100">
            {duelSummary.wins}/{duelSummary.finished}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenRanking}
        className="mb-3 rounded-xl border border-emerald-300/35 bg-emerald-500/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100"
      >
        Ver ranking geral
      </button>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [overscroll-behavior:contain]">
        <article className="rounded-2xl border border-fuchsia-200/30 bg-fuchsia-500/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-100/90">
            Historico de duelos
          </p>
          <p className="mt-1 text-xs text-white/75">
            Vitorias: {duelSummary.wins} • Derrotas: {duelSummary.losses} • Empates:{' '}
            {duelSummary.draws}
          </p>

          <div className="mt-3 space-y-2">
            {duelHistoryLoading ? (
              <div className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs text-white/80">
                Carregando historico de duelos...
              </div>
            ) : duelRows.length === 0 ? (
              <div className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs text-white/80">
                Voce ainda nao concluiu duelos com este login.
              </div>
            ) : (
              duelRows.map((duel) => (
                <article
                  key={duel.sessionId}
                  className="rounded-xl border border-white/20 bg-black/35 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
                        {duel.categoryTitle} • {duel.levelTitle}
                      </p>
                      <p className="text-[11px] text-white/65">
                        Duelou com {duel.rivalName} em {formatDate(duel.playedAt)}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${duel.resultClassName}`}
                    >
                      {duel.resultLabel}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/15 bg-black/20 px-2 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                        Voce
                      </p>
                      <p className="text-xs font-bold text-white">{duel.meScoreText}</p>
                      <p className="text-[11px] text-white/70">{duel.meDurationText}</p>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-black/20 px-2 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                        Rival
                      </p>
                      <p className="text-xs font-bold text-white">{duel.rivalScoreText}</p>
                      <p className="text-[11px] text-white/70">{duel.rivalDurationText}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        {groupedByQuiz.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-black/30 p-4 text-sm text-white/80">
            Voce ainda nao tem tentativas salvas com este login.
          </div>
        ) : (
          groupedByQuiz.map((quiz) => (
            <article
              key={quiz.quizId}
              className="rounded-2xl border border-white/25 bg-black/30 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                Quiz {quiz.quizId}
              </p>
              <h3 className="mt-1 text-sm font-bold text-white">{quiz.categoryTitle}</h3>

              <div className="mt-3 space-y-2">
                {quiz.entries.map((entry) => {
                  const percent =
                    entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0
                  const isSpeedrun = entry.playMode === 'speedrun'
                  const speedInfo = `${entry.points ?? entry.score} pts • ${formatDuration(entry.durationMs ?? 0)}`

                  return (
                    <details
                      key={entry.submissionId}
                      className="rounded-xl border border-white/20 bg-black/35 p-3"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
                              {entry.levelTitle}
                            </p>
                            <p className="text-[11px] text-white/65">
                              Respondido em {formatDate(entry.submittedAt)}
                            </p>
                          </div>
                          <div
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
                              isSpeedrun
                                ? 'border-amber-300/40 bg-amber-500/20 text-amber-100'
                                : 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
                            }`}
                          >
                            {isSpeedrun ? speedInfo : `${entry.score}/${entry.total} (${percent}%)`}
                          </div>
                        </div>
                      </summary>

                      <div className="mt-3 space-y-2">
                        {getEntryQuestions(categories, entry).map((question) => (
                          <div
                            key={`${entry.submissionId}:${question.questionId}`}
                            className="rounded-lg border border-white/15 bg-black/25 px-2 py-2"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                              {question.questionLabel}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-white">
                                {question.answer || '-'}
                              </p>
                              <span
                                className={`text-sm font-black ${
                                  question.correct ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                              >
                                {question.correct ? 'V' : 'X'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
