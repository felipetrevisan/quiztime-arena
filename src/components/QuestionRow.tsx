import type { AnswerMode, Question, ThemeOption } from '@/types/quiz'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'

interface QuestionRowProps {
  index: number
  question: Question
  isBlankMode?: boolean
  answerMode?: AnswerMode
  choiceOptions?: string[]
  showOptionImage?: boolean
  answer: string
  corrected: boolean
  result: boolean | undefined
  theme: ThemeOption
  imageOverride?: string
  allowImageUpload?: boolean
  onAnswerChange: (questionId: string, value: string) => void
  onImageUpload: (questionId: string, file: File) => void
}

export const QuestionRow = ({
  index,
  question,
  isBlankMode = false,
  answerMode = 'text',
  choiceOptions = [],
  showOptionImage = true,
  answer,
  corrected,
  result,
  theme,
  imageOverride,
  allowImageUpload = true,
  onAnswerChange,
  onImageUpload,
}: QuestionRowProps) => {
  const [showCorrect, setShowCorrect] = useState(false)
  const inputId = useId()
  const isChoiceMode = answerMode === 'choices' && !isBlankMode && choiceOptions.length > 0
  const safeCorrectIndex =
    question.correctIndex >= 0 && question.correctIndex < choiceOptions.length
      ? question.correctIndex
      : 0
  const selectedChoiceIndex = choiceOptions.findIndex((option) => option === answer)

  if (isChoiceMode) {
    return (
      <motion.article
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-2xl border p-3"
        style={{
          backgroundColor: theme.cardColor,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="space-y-3">
          <img
            src={imageOverride ?? question.imagePath}
            alt={`Imagem da pergunta ${index + 1}`}
            className="h-44 w-full rounded-2xl border border-white/25 object-cover shadow-lg"
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              Pergunta {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold leading-tight text-white/95">
              {question.question || question.prompt}
            </p>
          </div>

          <div className="space-y-2">
            {choiceOptions.map((option, optionIndex) => {
              const selected = selectedChoiceIndex === optionIndex
              const isCorrectOption = optionIndex === safeCorrectIndex
              const isWrongSelected = corrected && selected && !isCorrectOption

              const baseClassName = corrected
                ? isCorrectOption
                  ? 'border-emerald-300/65 bg-emerald-500/20 text-emerald-100'
                  : isWrongSelected
                    ? 'border-rose-300/65 bg-rose-500/20 text-rose-100'
                    : 'border-white/25 bg-black/20 text-white/80'
                : selected
                  ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_18px_rgba(34,211,238,0.28)]'
                  : 'border-white/30 bg-black/25 text-white hover:border-white/60'

              return (
                <motion.button
                  key={`${question.id}:option:${optionIndex}`}
                  type="button"
                  whileTap={corrected ? undefined : { scale: 0.985 }}
                  onClick={() => onAnswerChange(question.id, option)}
                  disabled={corrected}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition ${baseClassName}`}
                >
                  <span>{option}</span>
                  {corrected && isCorrectOption && (
                    <span className="ml-2 text-base font-black text-emerald-100">✓</span>
                  )}
                  {isWrongSelected && (
                    <span className="ml-2 text-base font-black text-rose-100">✗</span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.article>
    )
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative rounded-2xl border p-3"
      style={{
        backgroundColor: theme.cardColor,
        borderColor: theme.cardBorder,
      }}
    >
      <div className="flex gap-3">
        {showOptionImage && (
          <div className="shrink-0">
            <img
              src={imageOverride ?? question.imagePath}
              alt="Ilustracao da pergunta"
              className="h-16 w-16 rounded-full border border-white/30 object-cover shadow-lg"
            />
            {allowImageUpload && (
              <label className="mt-1 block cursor-pointer text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                Enviar imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file || corrected) return
                    onImageUpload(question.id, file)
                  }}
                  disabled={corrected}
                  aria-label={`Enviar imagem para ${isBlankMode ? 'alternativa' : 'pergunta'} ${index + 1}`}
                />
              </label>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            {isBlankMode ? `Alternativa ${index + 1}` : `Pergunta ${index + 1}`}
          </p>
          {!isBlankMode && (question.question || question.prompt) && (
            <label
              htmlFor={inputId}
              className="block text-sm font-semibold leading-tight text-white/95"
            >
              {question.question || question.prompt}
            </label>
          )}

          <input
            id={inputId}
            type="text"
            value={answer}
            onChange={(event) => onAnswerChange(question.id, event.target.value)}
            readOnly={corrected}
            placeholder={isBlankMode ? 'Digite a resposta da alternativa' : 'Digite sua resposta'}
            className="w-full rounded-xl border border-white/30 bg-black/25 px-3 py-2 text-sm outline-none transition placeholder:text-white/50 focus:border-white"
          />

          {corrected && !isBlankMode && question.correctAnswerDisplay && (
            <button
              type="button"
              onClick={() => setShowCorrect((prev) => !prev)}
              className="text-xs font-semibold uppercase tracking-[0.1em] text-white/80"
            >
              {showCorrect ? 'Ocultar resposta correta' : 'Mostrar resposta correta'}
            </button>
          )}

          <AnimatePresence>
            {corrected && !isBlankMode && showCorrect && question.correctAnswerDisplay && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-xs text-white/90"
              >
                Resposta correta: <strong>{question.correctAnswerDisplay}</strong>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0">
          <AnimatePresence>
            {corrected && (
              <motion.div
                key={result ? 'ok' : 'fail'}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                className={`grid h-12 w-12 place-items-center rounded-full text-2xl font-black ${
                  result ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300'
                }`}
                aria-label={result ? 'Resposta correta' : 'Resposta incorreta'}
              >
                {result ? 'V' : 'X'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}
