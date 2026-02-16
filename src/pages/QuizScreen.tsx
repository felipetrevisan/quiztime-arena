import { ProgressBar } from '@/components/ProgressBar'
import { QuestionRow } from '@/components/QuestionRow'
import type { Level, ThemeOption, TimingMode } from '@/types/quiz'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

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
  onAnswerChange: (questionId: string, value: string) => void
  onImageUpload: (questionId: string, file: File) => void
  onCorrect: () => void
  onFinishLevel: () => void
  onTakeScreenshot?: () => Promise<void>
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
  onAnswerChange,
  onImageUpload,
  onCorrect,
  onFinishLevel,
  onTakeScreenshot,
}: QuizScreenProps) => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const total = level.questions.length
  const answeredCount = level.questions.filter((question) =>
    Boolean(answers[question.id]?.trim()),
  ).length
  const progress = corrected ? 100 : (answeredCount / total) * 100
  const currentQuestion = Math.min(answeredCount + 1, total)
  const isSpeedrun = timingMode === 'speedrun'

  useEffect(() => {
    setElapsedMs(0)
  }, [])

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
      <div className="mb-3 flex items-center justify-between gap-2">
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
          <>
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
              onClick={onCorrect}
              className="flex-1 rounded-xl border border-white/25 bg-white/90 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
            >
              {isResponderMode
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
