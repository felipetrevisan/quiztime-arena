import type { RankingEntry } from '@/types/quiz'
import { formatDuration } from '@/utils/scoring'
import { useMemo, useState } from 'react'

type RankingTab = 'normal' | 'speedrun'

interface RankingScreenProps {
  entries: RankingEntry[]
  isPreviewMode?: boolean
  currentUserId?: string | null
  currentUserAliases?: string[]
  onBack: () => void
  onClear: () => void
}

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const getInitials = (value: string): string => {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const getPlayMode = (entry: RankingEntry): 'timeless' | 'speedrun' => {
  return entry.playMode === 'speedrun' ? 'speedrun' : 'timeless'
}

const normalizeIdentity = (value: string): string => value.trim().toLowerCase()

export const RankingScreen = ({
  entries,
  isPreviewMode = false,
  currentUserId = null,
  currentUserAliases = [],
  onBack,
  onClear,
}: RankingScreenProps) => {
  const [tab, setTab] = useState<RankingTab>('normal')
  const aliasSet = useMemo(
    () => new Set(currentUserAliases.map(normalizeIdentity)),
    [currentUserAliases],
  )

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const mode = getPlayMode(entry)
      return tab === 'normal' ? mode === 'timeless' : mode === 'speedrun'
    })
  }, [entries, tab])

  const groupedByQuiz = useMemo(() => {
    const quizzes = new Map<string, RankingEntry[]>()

    for (const entry of filtered) {
      const current = quizzes.get(entry.quizId) ?? []
      current.push(entry)
      quizzes.set(entry.quizId, current)
    }

    return [...quizzes.entries()].map(([quizId, quizEntries]) => {
      const levels = new Map<string, RankingEntry[]>()

      for (const entry of quizEntries) {
        const levelEntries = levels.get(entry.levelTitle) ?? []
        levelEntries.push(entry)
        levels.set(entry.levelTitle, levelEntries)
      }

      const groupedLevels = [...levels.entries()].map(([levelTitle, levelEntries]) => {
        const sortedLevelEntries = [...levelEntries].sort((left, right) => {
          if (tab === 'speedrun') {
            const leftPoints = left.points ?? left.score
            const rightPoints = right.points ?? right.score

            if (rightPoints !== leftPoints) {
              return rightPoints - leftPoints
            }

            const leftDuration = left.durationMs ?? 0
            const rightDuration = right.durationMs ?? 0
            if (leftDuration !== rightDuration) {
              return leftDuration - rightDuration
            }
          } else {
            const leftPercent = left.total ? left.score / left.total : 0
            const rightPercent = right.total ? right.score / right.total : 0

            if (rightPercent !== leftPercent) {
              return rightPercent - leftPercent
            }

            if (right.score !== left.score) {
              return right.score - left.score
            }
          }

          return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
        })

        return {
          levelTitle,
          entries: sortedLevelEntries,
        }
      })

      return {
        quizId,
        categoryTitle: quizEntries[0]?.categoryTitle ?? 'Quiz',
        levels: groupedLevels,
      }
    })
  }, [filtered, tab])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-white">
          {isPreviewMode ? 'Ranking do quiz' : 'Ranking'}
        </h2>
        {!isPreviewMode && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
          >
            Voltar
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('normal')}
          className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
            tab === 'normal'
              ? 'border-white/40 bg-white/90 text-slate-900'
              : 'border-white/25 bg-black/30 text-white/80'
          }`}
        >
          Modo Normal
        </button>
        <button
          type="button"
          onClick={() => setTab('speedrun')}
          className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${
            tab === 'speedrun'
              ? 'border-amber-300/60 bg-amber-500/20 text-amber-100'
              : 'border-white/25 bg-black/30 text-white/80'
          }`}
        >
          Speed Run
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groupedByQuiz.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-black/30 p-4 text-sm text-white/80">
            {tab === 'speedrun'
              ? 'Nenhum resultado de speed run ainda.'
              : 'Nenhum resultado no modo normal ainda.'}
          </div>
        ) : (
          groupedByQuiz.map((quizGroup) => (
            <article
              key={quizGroup.quizId}
              className="rounded-2xl border border-white/25 bg-black/30 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                Quiz {quizGroup.quizId}
              </p>
              <h3 className="mt-1 text-sm font-bold text-white">{quizGroup.categoryTitle}</h3>

              <div className="mt-3 space-y-3">
                {quizGroup.levels.map((levelGroup) => (
                  <section key={`${quizGroup.quizId}:${levelGroup.levelTitle}`}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                      {levelGroup.levelTitle}
                    </p>

                    <div className="space-y-2">
                      {levelGroup.entries.map((entry, index) => {
                        const percent = entry.total
                          ? Math.round((entry.score / entry.total) * 100)
                          : 0
                        const points = entry.points ?? entry.score
                        const durationMs = entry.durationMs ?? 0
                        const isCurrentUser = Boolean(
                          (currentUserId && entry.userId === currentUserId) ||
                            (!entry.userId &&
                              aliasSet.size > 0 &&
                              aliasSet.has(normalizeIdentity(entry.responderName))),
                        )

                        return (
                          <div
                            key={entry.submissionId}
                            className={`rounded-xl border bg-black/35 p-3 ${
                              isCurrentUser
                                ? 'border-cyan-200/60 ring-1 ring-cyan-300/40'
                                : 'border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                {entry.responderAvatarDataUrl ? (
                                  <img
                                    src={entry.responderAvatarDataUrl}
                                    alt={`Avatar de ${entry.responderName}`}
                                    className="h-10 w-10 rounded-full border border-white/30 object-cover"
                                  />
                                ) : (
                                  <div className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 text-xs font-bold text-white/90">
                                    {getInitials(entry.responderName)}
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                                    #{index + 1} {entry.responderName}
                                  </p>
                                  {isCurrentUser && (
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                                      Voce
                                    </p>
                                  )}
                                  <p className="text-[11px] text-white/65">
                                    Recebido em {formatDate(entry.submittedAt)}
                                  </p>
                                </div>
                              </div>

                              {tab === 'speedrun' ? (
                                <div className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-amber-100">
                                  {points} pts • {formatDuration(durationMs)}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-100">
                                  {entry.score}/{entry.total} ({percent}%)
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {!isPreviewMode && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/20 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-rose-100"
        >
          Limpar ranking
        </button>
      )}
    </section>
  )
}
