import { ProgressBar } from '@/components/ProgressBar'
import { QuestionRow } from '@/components/QuestionRow'
import type { Level, Question, ThemeOption, TimingMode } from '@/types/quiz'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

import { normalizeAnswer } from '@/utils/normalize'
import { shouldShowQuestionImage } from '@/utils/question-image'
import { formatDuration } from '@/utils/scoring'

interface QuizScreenProps {
  level: Level
  theme: ThemeOption
  timingMode?: TimingMode
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
  showResponderExit?: boolean
  backButtonLabel?: string
  onAnswerChange: (questionId: string, value: string) => void
  onImageUpload: (questionId: string, file: File) => void
  onCorrect: () => void
  onFinishLevel: () => void
  onTakeScreenshot?: () => Promise<void>
}

const fallbackWrongOptions = [
  'Arvore magica',
  'Planeta zeta',
  'Capitao turbo',
  'Cidade neon',
  'Projeto omega',
  'Cometa azul',
  'Ilha secreta',
  'Operacao fox',
]

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

const getCorrectOption = (question: Question): string => {
  const options = Array.isArray(question.options) ? question.options : []
  if (options.length > 0) {
    const safeIndex =
      typeof question.correctIndex === 'number' &&
      question.correctIndex >= 0 &&
      question.correctIndex < options.length
        ? question.correctIndex
        : 0
    const byIndex = options[safeIndex]?.trim()
    if (byIndex) {
      return byIndex
    }
  }

  if (question.correctAnswerDisplay.trim()) {
    return question.correctAnswerDisplay.trim()
  }
  if (question.acceptedAnswers[0]?.trim()) {
    return question.acceptedAnswers[0].trim()
  }
  return 'Resposta correta'
}

const uniqueByNormalized = (items: string[]): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  for (const item of items) {
    const key = normalizeAnswer(item)
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    next.push(item)
  }

  return next
}

const buildChoiceOptionsMap = (level: Level): Record<string, string[]> => {
  const answerPool = level.questions.map((question) => getCorrectOption(question))

  return Object.fromEntries(
    level.questions.map((question) => {
      const baseOptions = Array.isArray(question.options) ? question.options : []
      const sanitizedOptions = baseOptions.map((option) => option.trim()).filter(Boolean)
      if (sanitizedOptions.length === 4) {
        return [question.id, sanitizedOptions]
      }

      const correct = getCorrectOption(question)
      const normalizedCorrect = normalizeAnswer(correct)
      const wrongCandidates = answerPool.filter(
        (item) => normalizeAnswer(item) !== normalizedCorrect,
      )
      const uniqueWrong = uniqueByNormalized(wrongCandidates)
      const selectedWrong = shuffle(uniqueWrong).slice(0, 3)

      for (const fallback of fallbackWrongOptions) {
        if (selectedWrong.length >= 3) {
          break
        }
        const normalizedFallback = normalizeAnswer(fallback)
        const exists = selectedWrong.some(
          (candidate) => normalizeAnswer(candidate) === normalizedFallback,
        )
        if (normalizedFallback !== normalizedCorrect && !exists) {
          selectedWrong.push(fallback)
        }
      }

      let optionIndex = 1
      while (selectedWrong.length < 3) {
        const fallback = `Opcao ${optionIndex}`
        optionIndex += 1
        const normalizedFallback = normalizeAnswer(fallback)
        if (
          normalizedFallback !== normalizedCorrect &&
          !selectedWrong.some((candidate) => normalizeAnswer(candidate) === normalizedFallback)
        ) {
          selectedWrong.push(fallback)
        }
      }

      return [question.id, [correct, ...selectedWrong.slice(0, 3)]]
    }),
  )
}

export const QuizScreen = ({
  level,
  theme,
  timingMode = 'timeless',
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
  showResponderExit = false,
  backButtonLabel,
  onAnswerChange,
  onImageUpload,
  onCorrect,
  onFinishLevel,
  onTakeScreenshot,
}: QuizScreenProps) => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const total = level.questions.length
  const answeredCount = level.questions.filter((question) =>
    Boolean(answers[question.id]?.trim()),
  ).length
  const isSpeedrun = timingMode === 'speedrun'
  const isChoiceMode = level.answerMode === 'choices' && !isBlankMode
  const currentQuestion = isChoiceMode
    ? Math.min(currentQuestionIndex + 1, total)
    : Math.min(answeredCount + 1, total)
  const progress = corrected
    ? total > 0
      ? 100
      : 0
    : isChoiceMode
      ? total > 0
        ? (currentQuestion / total) * 100
        : 0
      : total > 0
        ? (answeredCount / total) * 100
        : 0
  const choiceOptionsMap = useMemo(
    () => (isChoiceMode ? buildChoiceOptionsMap(level) : {}),
    [isChoiceMode, level],
  )
  const visibleQuestions = isChoiceMode
    ? [level.questions[currentQuestionIndex]].filter(Boolean)
    : level.questions

  // biome-ignore lint/correctness/useExhaustiveDependencies: its ok here
  useEffect(() => {
    setElapsedMs(0)
    setCurrentQuestionIndex(0)
  }, [level.id])

  useEffect(() => {
    if (!isSpeedrun || corrected) {
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 250)

    return () => {
      window.clearInterval(timer)
    }
  }, [corrected, isSpeedrun])

  const handleTakeScreenshot = async () => {
    if (!onTakeScreenshot || isCapturing) {
      return
    }

    setIsCapturing(true)
    try {
      await onTakeScreenshot()
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={`${isResponderMode ? 'mb-2' : 'mb-3'} flex items-center justify-between gap-2`}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/75">
            {level.title}
          </p>
          <h2 className="font-display text-base font-bold uppercase tracking-[0.16em] text-white">
            {isBlankMode ? 'Alternativa' : 'Pergunta'} {currentQuestion}/{total}
          </h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-100/85">
            {isSpeedrun ? `Speed Run • ${formatDuration(elapsedMs)}` : 'Timeless'}
          </p>
        </div>
        {(!isResponderMode || showResponderExit) && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
          >
            {backButtonLabel ?? (isResponderMode ? 'Sair' : 'Voltar')}
          </button>
        )}
      </div>

      <ProgressBar value={progress} accentColor={theme.accentColor} />

      {isResponderMode && (
        <div className="mt-2 rounded-2xl border border-white/20 bg-black/30 p-2">
          <button
            type="button"
            aria-expanded={profileExpanded}
            onClick={() => setProfileExpanded((previous) => !previous)}
            className="flex w-full items-center justify-between rounded-xl border border-white/25 bg-black/35 px-3 py-2 text-left"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/90">
              Perfil do jogador
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
              {profileExpanded ? 'Ocultar' : 'Editar'}
            </span>
          </button>

          {profileExpanded && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <img
                  src={responderAvatarDataUrl ?? '/assets/cartoons/template.svg'}
                  alt="Avatar do jogador"
                  className="h-10 w-10 rounded-full border border-white/30 object-cover"
                />
                <label className="cursor-pointer rounded-lg border border-white/30 bg-black/35 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
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
                className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75"
              >
                Nome de quem esta jogando
              </label>
              <input
                id="responder-name"
                value={responderName}
                onChange={(event) => onResponderNameChange?.(event.target.value)}
                placeholder="Ex: Ana"
                className="mt-1.5 w-full rounded-xl border border-white/30 bg-black/25 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          )}
        </div>
      )}

      <div className={`${isResponderMode ? 'mt-2' : 'mt-3'} min-h-0 flex-1 overflow-hidden`}>
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
          {visibleQuestions.map((question, index) => {
            const imagePath = uploadedImages[question.id] ?? question.imagePath
            const showQuestionImage = shouldShowQuestionImage({
              imagePath,
              hideDefaultQuestionImage: level.hideDefaultQuestionImage ?? true,
            })

            return (
              <QuestionRow
                key={question.id}
                index={isChoiceMode ? currentQuestionIndex : index}
                question={question}
                isBlankMode={isBlankMode}
                answerMode={isChoiceMode ? 'choices' : 'text'}
                choiceOptions={choiceOptionsMap[question.id] ?? []}
                showQuestionImage={showQuestionImage}
                showOptionImage={isBlankMode && showQuestionImage}
                answer={answers[question.id] ?? ''}
                corrected={corrected}
                result={results[question.id]}
                theme={theme}
                imageOverride={imagePath}
                allowImageUpload={!isResponderMode && !isBlankMode}
                onAnswerChange={onAnswerChange}
                onImageUpload={onImageUpload}
              />
            )
          })}
        </motion.div>
      </div>

      <div className="mt-3 flex gap-2">
        {!corrected ? (
          <>
            {isChoiceMode && (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((previous) => Math.max(0, previous - 1))}
                disabled={currentQuestionIndex === 0}
                className="rounded-xl border border-white/30 bg-black/35 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
            )}
            {isResponderMode && onTakeScreenshot && (
              <button
                type="button"
                onClick={() => void handleTakeScreenshot()}
                disabled={isCapturing}
                className="rounded-xl border border-white/30 bg-black/35 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCapturing ? 'Capturando...' : 'Screenshot'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isChoiceMode && currentQuestionIndex < total - 1) {
                  setCurrentQuestionIndex((previous) => previous + 1)
                  return
                }

                onCorrect()
              }}
              disabled={
                isChoiceMode &&
                currentQuestionIndex < total - 1 &&
                !answers[level.questions[currentQuestionIndex]?.id ?? '']?.trim()
              }
              className="flex-1 rounded-xl border border-white/25 bg-white/90 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
            >
              {isChoiceMode
                ? currentQuestionIndex < total - 1
                  ? 'Proxima'
                  : 'Finalizar nivel'
                : isResponderMode
                  ? 'Enviar respostas'
                  : isBlankMode
                    ? 'Finalizar respostas'
                    : 'Corrigir'}
            </button>
          </>
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
