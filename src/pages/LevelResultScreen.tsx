import { ExportButton } from '@/components/ExportButton'
import type { Level } from '@/types/quiz'
import type { RefObject } from 'react'

interface LevelResultScreenProps {
  level: Level
  levelNumber: number
  score: number
  total: number
  answers: Record<string, string>
  results: Record<string, boolean>
  uploadedImages: Record<string, string>
  hasNextLevel: boolean
  frameRef: RefObject<HTMLElement>
  sheetRef: RefObject<HTMLElement>
  summaryRef: RefObject<HTMLElement>
  onBackToLevels: () => void
  onNext: () => void
}

export const LevelResultScreen = ({
  level,
  levelNumber,
  score,
  total,
  answers,
  results,
  uploadedImages,
  hasNextLevel,
  frameRef,
  sheetRef,
  summaryRef,
  onBackToLevels,
  onNext,
}: LevelResultScreenProps) => {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
          {level.title}
        </p>
        <h2 className="mt-2 font-display text-3xl font-black uppercase tracking-[0.18em] text-white">
          {score}/{total}
        </h2>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-auto pr-1">
        {level.questions.map((question, index) => {
          const isCorrect = results[question.id]
          return (
            <div
              key={question.id}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-black/30 p-2 text-left"
            >
              {level.mode === 'blank' && (
                <img
                  src={uploadedImages[question.id] ?? question.imagePath}
                  alt={question.question || question.prompt}
                  className="h-10 w-10 rounded-full border border-white/25 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-white/75">
                  Pergunta {index + 1}
                </p>
                <p className="truncate text-xs text-white">{answers[question.id] || '-'}</p>
              </div>
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${
                  isCorrect ? 'bg-emerald-500/25 text-emerald-200' : 'bg-rose-500/25 text-rose-200'
                }`}
              >
                {isCorrect ? 'V' : 'X'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 grid w-full gap-2">
        <ExportButton
          targetRef={frameRef}
          fileName={`quiztime-nivel-${levelNumber}.png`}
          label="Salvar resultado como imagem (PNG)"
        />
        <ExportButton
          targetRef={summaryRef}
          fileName={`quiztime-resumo-nivel-${levelNumber}.png`}
          label="Salvar resumo do nivel"
        />
        <ExportButton
          targetRef={sheetRef}
          fileName={`quiztime-gabarito-nivel-${levelNumber}.png`}
          label="Salvar gabarito"
        />
      </div>

      <div className="mt-4 grid w-full gap-2">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
        >
          {hasNextLevel ? 'Proximo nivel' : 'Ver resultado final'}
        </button>
        <button
          type="button"
          onClick={onBackToLevels}
          className="rounded-xl border border-white/25 bg-black/25 px-3 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85"
        >
          Voltar para niveis
        </button>
      </div>
    </section>
  )
}
