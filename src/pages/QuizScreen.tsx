import { ProgressBar } from '@/components/ProgressBar'
import { QuestionRow } from '@/components/QuestionRow'
import type { Level, ThemeOption } from '@/types/quiz'
import { motion } from 'motion/react'

interface QuizScreenProps {
  level: Level
  theme: ThemeOption
  isBlankMode?: boolean
  isResponderMode?: boolean
  responderName?: string
  responderAvatarDataUrl?: string | null
  answers: Record<string, string>
  corrected: boolean
  results: Record<string, boolean>
  uploadedImages: Record<string, string>
  onBack: () => void
  onResponderNameChange?: (value: string) => void
  onResponderAvatarUpload?: (file: File) => void
  onAnswerChange: (questionId: string, value: string) => void
  onImageUpload: (questionId: string, file: File) => void
  onCorrect: () => void
  onFinishLevel: () => void
}

export const QuizScreen = ({
  level,
  theme,
  isBlankMode = false,
  isResponderMode = false,
  responderName = '',
  responderAvatarDataUrl = null,
  answers,
  corrected,
  results,
  uploadedImages,
  onBack,
  onResponderNameChange,
  onResponderAvatarUpload,
  onAnswerChange,
  onImageUpload,
  onCorrect,
  onFinishLevel,
}: QuizScreenProps) => {
  const total = level.questions.length
  const answeredCount = level.questions.filter((question) =>
    Boolean(answers[question.id]?.trim()),
  ).length
  const progress = corrected ? 100 : (answeredCount / total) * 100
  const currentQuestion = Math.min(answeredCount + 1, total)

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/75">
            {level.title}
          </p>
          <h2 className="font-display text-base font-bold uppercase tracking-[0.16em] text-white">
            {isBlankMode ? 'Alternativa' : 'Pergunta'} {currentQuestion}/{total}
          </h2>
        </div>
        {!isResponderMode && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
          >
            Voltar
          </button>
        )}
      </div>

      <ProgressBar value={progress} accentColor={theme.accentColor} />

      {isResponderMode && (
        <div className="mt-3 rounded-2xl border border-white/20 bg-black/30 p-3">
          <div className="flex items-center gap-3">
            <img
              src={responderAvatarDataUrl ?? '/assets/cartoons/template.svg'}
              alt="Avatar do jogador"
              className="h-14 w-14 rounded-full border border-white/30 object-cover"
            />
            <label className="cursor-pointer rounded-lg border border-white/30 bg-black/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Upload avatar
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  onResponderAvatarUpload?.(file)
                }}
              />
            </label>
          </div>
          <label
            htmlFor="responder-name"
            className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-white/75"
          >
            Nome de quem esta jogando
          </label>
          <input
            id="responder-name"
            value={responderName}
            onChange={(event) => onResponderNameChange?.(event.target.value)}
            placeholder="Ex: Ana"
            className="mt-2 w-full rounded-xl border border-white/30 bg-black/25 px-3 py-2 text-sm text-white outline-none"
          />
        </div>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        <motion.div
          className="h-full space-y-3 overflow-y-auto pr-1 [overscroll-behavior:contain]"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.06,
              },
            },
          }}
        >
          {level.questions.map((question, index) => (
            <QuestionRow
              key={question.id}
              index={index}
              question={question}
              isBlankMode={isBlankMode}
              showOptionImage={isBlankMode}
              answer={answers[question.id] ?? ''}
              corrected={corrected}
              result={results[question.id]}
              theme={theme}
              imageOverride={uploadedImages[question.id]}
              allowImageUpload={!isResponderMode}
              onAnswerChange={onAnswerChange}
              onImageUpload={onImageUpload}
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-3 flex gap-2">
        {!corrected ? (
          <button
            type="button"
            onClick={onCorrect}
            className="flex-1 rounded-xl border border-white/25 bg-white/90 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
          >
            {isBlankMode ? 'Finalizar respostas' : 'Corrigir'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinishLevel}
            className="flex-1 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100"
          >
            Finalizar nivel
          </button>
        )}
      </div>
    </section>
  )
}
