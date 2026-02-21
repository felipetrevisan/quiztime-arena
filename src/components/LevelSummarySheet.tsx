import type { Level, ThemeOption } from '@/types/quiz'
import { shouldShowQuestionImage } from '@/utils/question-image'

interface LevelSummarySheetProps {
  theme: ThemeOption
  title: string
  subtitle: string
  level: Level
  score: number
  total: number
  answers: Record<string, string>
  results: Record<string, boolean>
  imageOverrides?: Record<string, string>
}

export const LevelSummarySheet = ({
  theme,
  title,
  subtitle,
  level,
  score,
  total,
  answers,
  results,
  imageOverrides = {},
}: LevelSummarySheetProps) => {
  return (
    <div
      className="w-[460px] rounded-[2rem] border border-white/20 p-4 text-white"
      style={{
        backgroundImage: `linear-gradient(140deg, ${theme.gradientFrom}, ${theme.gradientVia}, ${theme.gradientTo})`,
      }}
    >
      <header className="mb-4 text-center">
        <h2
          className="font-display text-xl font-black uppercase tracking-[0.2em]"
          style={{ color: theme.headerColor }}
        >
          {title}
        </h2>
        <p className="font-display text-xs uppercase tracking-[0.24em] text-white/85">{subtitle}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
          Resumo do nivel
        </p>
        <p className="mt-1 text-lg font-black uppercase tracking-[0.12em] text-white">
          {score}/{total}
        </p>
      </header>

      <div className="space-y-2">
        {level.questions.map((question, index) => {
          const isCorrect = results[question.id]
          const answerLabel = answers[question.id] || '-'
          const imagePath = imageOverrides[question.id] ?? question.imagePath
          const showImage = shouldShowQuestionImage({
            imagePath,
            hideDefaultQuestionImage: level.hideDefaultQuestionImage ?? true,
          })

          return (
            <div
              key={question.id}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-black/25 p-2 text-xs"
            >
              {showImage && (
                <img
                  src={imagePath}
                  alt={`Imagem da pergunta ${index + 1}`}
                  className="h-12 w-12 rounded-lg border border-white/30 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{question.question || question.prompt}</p>
                <p className="truncate text-white/80">Marcada: {answerLabel}</p>
              </div>
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-base font-black ${
                  isCorrect ? 'bg-emerald-500/25 text-emerald-200' : 'bg-rose-500/25 text-rose-200'
                }`}
              >
                {isCorrect ? '✓' : '✗'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
