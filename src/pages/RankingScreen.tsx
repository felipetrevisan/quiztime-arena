import type { RankingEntry } from '@/types/quiz'

interface RankingScreenProps {
  entries: RankingEntry[]
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

export const RankingScreen = ({ entries, onBack, onClear }: RankingScreenProps) => {
  const sorted = [...entries].sort((left, right) => {
    const leftPercent = left.total ? left.score / left.total : 0
    const rightPercent = right.total ? right.score / right.total : 0

    if (rightPercent !== leftPercent) {
      return rightPercent - leftPercent
    }

    if (right.score !== left.score) {
      return right.score - left.score
    }

    return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
  })

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-white">
          Ranking
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-black/30 p-4 text-sm text-white/80">
            Nenhuma resposta recebida ainda. Gere um link e importe os resultados para montar o
            ranking.
          </div>
        ) : (
          sorted.map((entry, index) => {
            const percent = entry.total ? Math.round((entry.score / entry.total) * 100) : 0
            return (
              <article
                key={entry.submissionId}
                className="rounded-2xl border border-white/25 bg-black/35 p-3"
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
                      <p className="text-sm font-bold text-white">{entry.levelTitle}</p>
                      <p className="text-[11px] text-white/70">{entry.categoryTitle}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-100">
                    {entry.score}/{entry.total} ({percent}%)
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-white/65">
                  Recebido em {formatDate(entry.submittedAt)}
                </p>
              </article>
            )
          })
        )}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/20 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-rose-100"
      >
        Limpar ranking
      </button>
    </section>
  )
}
