import { useEffect, useMemo, useState } from 'react'

import type { TimingMode } from '@/types/quiz'
import { formatDuration } from '@/utils/scoring'

type SubmitState = 'sending' | 'success' | 'error'

interface RespondResultScreenProps {
  score: number
  total: number
  points: number
  durationMs: number
  playMode: TimingMode
  levelTitle: string
  responderName: string
  onOpenRanking: () => void
  onOpenPlay: () => void
  onOpenHome: () => void
  onSubmitResult: () => Promise<boolean>
}

export const RespondResultScreen = ({
  score,
  total,
  points,
  durationMs,
  playMode,
  levelTitle,
  responderName,
  onOpenRanking,
  onOpenPlay,
  onOpenHome,
  onSubmitResult,
}: RespondResultScreenProps) => {
  const [submitState, setSubmitState] = useState<SubmitState>('sending')

  const percent = useMemo(() => {
    if (!total) return 0
    return Math.round((score / total) * 100)
  }, [score, total])

  useEffect(() => {
    let active = true

    const run = async () => {
      setSubmitState('sending')
      const ok = await onSubmitResult()
      if (!active) {
        return
      }
      setSubmitState(ok ? 'success' : 'error')
    }

    void run()

    return () => {
      active = false
    }
  }, [onSubmitResult])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Modo resposta
        </p>
        <h2 className="mt-2 font-display text-xl font-black uppercase tracking-[0.15em] text-white">
          {levelTitle}
        </h2>
        <p className="mt-2 text-sm text-white/85">
          Pontuacao:{' '}
          <strong>
            {score}/{total}
          </strong>{' '}
          ({percent}%)
        </p>
        {playMode === 'speedrun' && (
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-100/90">
            Speed Run • {points} pts • {formatDuration(durationMs)}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/20 bg-black/30 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Jogador</p>
        <p className="mt-1 text-base font-bold text-white">{responderName.trim() || 'Jogador'}</p>

        {submitState === 'sending' && (
          <p className="mt-3 text-sm text-white/80">Enviando resultado para o ranking...</p>
        )}

        {submitState === 'success' && (
          <p className="mt-3 text-sm text-emerald-200">Resultado enviado com sucesso.</p>
        )}

        {submitState === 'error' && (
          <p className="mt-3 text-sm text-rose-200">
            Nao foi possivel enviar agora. Tente novamente em alguns segundos.
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            void onSubmitResult().then((ok) => {
              setSubmitState(ok ? 'success' : 'error')
            })
          }}
          className="rounded-xl border border-white/30 bg-black/35 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Reenviar
        </button>

        <button
          type="button"
          onClick={onOpenRanking}
          className="rounded-xl border border-emerald-300/35 bg-emerald-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
        >
          Ver ranking
        </button>

        <button
          type="button"
          onClick={onOpenPlay}
          className="rounded-xl border border-cyan-300/35 bg-cyan-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100"
        >
          Jogar outro quiz
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenHome}
        className="mt-2 rounded-xl border border-white/25 bg-black/25 px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
      >
        Voltar para home
      </button>
    </section>
  )
}
