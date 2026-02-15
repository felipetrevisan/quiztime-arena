import { ExportButton } from '@/components/ExportButton'
import type { RefObject } from 'react'

interface FinalScreenProps {
  score: number
  total: number
  badge: string
  comment: string
  frameRef: RefObject<HTMLElement>
  onPlayAgain: () => void
  onChangeCategory: () => void
}

export const FinalScreen = ({
  score,
  total,
  badge,
  comment,
  frameRef,
  onPlayAgain,
  onChangeCategory,
}: FinalScreenProps) => {
  return (
    <section className="mt-8 flex flex-1 flex-col items-center justify-center text-center">
      <p className="rounded-full border border-white/20 bg-black/25 px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">
        Resultado final
      </p>
      <h2 className="mt-3 font-display text-4xl font-black uppercase tracking-[0.18em] text-white">
        {score}/{total}
      </h2>
      <p className="mt-2 text-base font-bold uppercase tracking-[0.14em] text-white">
        Badge: {badge}
      </p>
      <p className="mt-3 max-w-xs text-sm text-white/90">{comment}</p>

      <div className="mt-6 grid w-full gap-2">
        <ExportButton
          targetRef={frameRef}
          fileName="quiztime-resultado-final.png"
          label="Salvar resultado como imagem (PNG)"
        />
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
        >
          Jogar de novo
        </button>
        <button
          type="button"
          onClick={onChangeCategory}
          className="rounded-xl border border-white/25 bg-black/25 px-3 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85"
        >
          Trocar categoria
        </button>
      </div>
    </section>
  )
}
