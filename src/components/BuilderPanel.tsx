import type {
  AnswerMode,
  Category,
  LevelMode,
  QuestionImageSuggestion,
  TimingMode,
} from '@/types/quiz'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useMemo, useState } from 'react'

export type BuilderPanelSection = 'category' | 'level' | 'answer'

interface BuilderPanelProps {
  categories: Category[]
  section?: BuilderPanelSection
  onAddCategory: (category: Category) => void | Promise<void>
  onAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
  ) => void | Promise<void>
  onUpdateQuestion: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
    options: string[]
    correctIndex: number
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => void | Promise<void>
  onGenerateQuestionChoices: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => Promise<string[] | null>
  onSuggestQuestionImages: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
  }) => Promise<QuestionImageSuggestion[] | null>
  onUploadQuestionImage: (payload: {
    categoryId: string
    levelId: string
    questionId: string
    file: File
  }) => void | Promise<void>
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')

const parseAcceptedAnswers = (value: string): string[] =>
  value
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)

export const BuilderPanel = ({
  categories,
  section,
  onAddCategory,
  onAddLevel,
  onUpdateQuestion,
  onGenerateQuestionChoices,
  onSuggestQuestionImages,
  onUploadQuestionImage,
}: BuilderPanelProps) => {
  const [categoryTitle, setCategoryTitle] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [levelTitle, setLevelTitle] = useState('')
  const [levelDescription, setLevelDescription] = useState('')
  const [levelMode, setLevelMode] = useState<LevelMode>('quiz')
  const [timingMode, setTimingMode] = useState<TimingMode>('timeless')
  const [answerMode, setAnswerMode] = useState<AnswerMode>('text')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [questionCategoryId, setQuestionCategoryId] = useState(categories[0]?.id ?? '')
  const [questionLevelId, setQuestionLevelId] = useState(categories[0]?.levels[0]?.id ?? '')
  const [questionId, setQuestionId] = useState(categories[0]?.levels[0]?.questions[0]?.id ?? '')
  const [questionPrompt, setQuestionPrompt] = useState('')
  const [questionImagePath, setQuestionImagePath] = useState('')
  const [questionImageHint, setQuestionImageHint] = useState('')
  const [optionInputs, setOptionInputs] = useState<string[]>(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [correctAnswerDisplay, setCorrectAnswerDisplay] = useState('')
  const [acceptedAnswersInput, setAcceptedAnswersInput] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [generatingChoices, setGeneratingChoices] = useState(false)
  const [suggestingImages, setSuggestingImages] = useState(false)
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null)
  const [imageSuggestions, setImageSuggestions] = useState<QuestionImageSuggestion[]>([])

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.title })),
    [categories],
  )

  const levelOptions = useMemo(
    () => categories.find((category) => category.id === questionCategoryId)?.levels ?? [],
    [categories, questionCategoryId],
  )

  const questionOptions = useMemo(
    () => levelOptions.find((level) => level.id === questionLevelId)?.questions ?? [],
    [levelOptions, questionLevelId],
  )

  const selectedLevel = useMemo(
    () => levelOptions.find((level) => level.id === questionLevelId) ?? null,
    [levelOptions, questionLevelId],
  )

  const selectedQuestion = useMemo(
    () => questionOptions.find((question) => question.id === questionId) ?? null,
    [questionId, questionOptions],
  )

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryId('')
      setQuestionCategoryId('')
      setQuestionLevelId('')
      setQuestionId('')
      return
    }

    if (!categories.some((category) => category.id === categoryId)) {
      setCategoryId(categories[0].id)
    }

    const nextQuestionCategoryId = categories.some((category) => category.id === questionCategoryId)
      ? questionCategoryId
      : categories[0].id

    if (nextQuestionCategoryId !== questionCategoryId) {
      setQuestionCategoryId(nextQuestionCategoryId)
    }

    const nextLevels =
      categories.find((category) => category.id === nextQuestionCategoryId)?.levels ?? []
    const nextQuestionLevelId = nextLevels.some((level) => level.id === questionLevelId)
      ? questionLevelId
      : (nextLevels[0]?.id ?? '')

    if (nextQuestionLevelId !== questionLevelId) {
      setQuestionLevelId(nextQuestionLevelId)
    }

    const nextQuestions =
      nextLevels.find((level) => level.id === nextQuestionLevelId)?.questions ?? []
    const nextQuestionId = nextQuestions.some((question) => question.id === questionId)
      ? questionId
      : (nextQuestions[0]?.id ?? '')

    if (nextQuestionId !== questionId) {
      setQuestionId(nextQuestionId)
    }
  }, [categories, categoryId, questionCategoryId, questionId, questionLevelId])

  useEffect(() => {
    if (!selectedQuestion) {
      setQuestionPrompt('')
      setQuestionImagePath('')
      setQuestionImageHint('')
      setOptionInputs(['', '', '', ''])
      setCorrectIndex(0)
      setCorrectAnswerDisplay('')
      setAcceptedAnswersInput('')
      setImageSuggestions([])
      return
    }

    setQuestionPrompt(selectedQuestion.question || selectedQuestion.prompt)
    setQuestionImagePath(selectedQuestion.imagePath)
    setQuestionImageHint(selectedQuestion.imageHint ?? '')
    const safeOptions = Array.isArray(selectedQuestion.options) ? [...selectedQuestion.options] : []
    while (safeOptions.length < 4) {
      safeOptions.push('')
    }
    setOptionInputs(safeOptions.slice(0, 4))
    setCorrectIndex(
      selectedQuestion.correctIndex >= 0 && selectedQuestion.correctIndex < 4
        ? selectedQuestion.correctIndex
        : 0,
    )
    setCorrectAnswerDisplay(selectedQuestion.correctAnswerDisplay)
    setAcceptedAnswersInput(selectedQuestion.acceptedAnswers.join(', '))
    setImageSuggestions([])
  }, [selectedQuestion])

  const showCategorySection = !section || section === 'category'
  const showLevelSection = !section || section === 'level'
  const showAnswerSection = !section || section === 'answer'

  const buildCurrentQuestionUpdatePayload = (nextImagePath: string) => {
    if (!questionCategoryId || !questionLevelId || !questionId || !selectedQuestion) {
      return null
    }

    const normalizedOptions = optionInputs.map((item) => item.trim())
    const safeCorrectIndex = correctIndex >= 0 && correctIndex < 4 ? correctIndex : 0
    const resolvedCorrectFromOptions =
      selectedLevel?.answerMode === 'choices' ? (normalizedOptions[safeCorrectIndex] ?? '') : ''
    const fallbackCorrect =
      selectedQuestion.correctAnswerDisplay.trim() || selectedQuestion.acceptedAnswers[0] || ''
    const correct = (resolvedCorrectFromOptions || correctAnswerDisplay || fallbackCorrect).trim()
    const acceptedAnswers = parseAcceptedAnswers(acceptedAnswersInput)
    const hasCorrectAlready = acceptedAnswers.some(
      (item) => item.toLowerCase() === correct.toLowerCase(),
    )

    if (correct && !hasCorrectAlready) {
      acceptedAnswers.unshift(correct)
    }

    return {
      categoryId: questionCategoryId,
      levelId: questionLevelId,
      questionId,
      prompt: questionPrompt.trim(),
      imagePath: nextImagePath,
      imageHint: questionImageHint.trim(),
      options: normalizedOptions,
      correctIndex: safeCorrectIndex,
      correctAnswerDisplay: correct,
      acceptedAnswers,
    }
  }

  const applyImageSuggestion = async (suggestion: QuestionImageSuggestion) => {
    if (!questionCategoryId || !questionLevelId || !questionId || !selectedQuestion) {
      return
    }

    setApplyingSuggestionId(suggestion.id)
    try {
      const response = await fetch(suggestion.imageUrl)
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }
      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) {
        throw new Error('Invalid image MIME type')
      }

      const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg'
      const file = new File([blob], `ai-${questionId}.${extension}`, {
        type: blob.type || 'image/jpeg',
      })

      await onUploadQuestionImage({
        categoryId: questionCategoryId,
        levelId: questionLevelId,
        questionId,
        file,
      })

      setQuestionImagePath(suggestion.imageUrl)
      setFeedback('Imagem da sugestao aplicada com sucesso.')
      return
    } catch (error) {
      console.warn('Falha ao importar imagem sugerida para upload', error)
    } finally {
      setApplyingSuggestionId(null)
    }

    const payload = buildCurrentQuestionUpdatePayload(suggestion.imageUrl)
    if (!payload) {
      setFeedback('Nao foi possivel aplicar a sugestao de imagem.')
      return
    }

    await onUpdateQuestion(payload)
    setQuestionImagePath(suggestion.imageUrl)
    setFeedback('Imagem aplicada por URL externa (sem upload local).')
  }

  return (
    <aside className="space-y-3 rounded-3xl border border-white/20 bg-black/35 p-4 text-white shadow-xl backdrop-blur-sm">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em]">Builder</h2>
      <p className="text-xs text-white/75">
        Crie niveis com perguntas ou em branco com 8 alternativas.
      </p>
      {feedback && (
        <p className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
          {feedback}
        </p>
      )}

      {showCategorySection && (
        <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Nova categoria
          </p>
          <Input
            value={categoryTitle}
            onChange={(event) => setCategoryTitle(event.target.value)}
            placeholder="Titulo"
          />
          <Input
            value={categoryDescription}
            onChange={(event) => setCategoryDescription(event.target.value)}
            placeholder="Descricao"
          />
          <Button
            type="button"
            onClick={async () => {
              if (!categoryTitle.trim()) return

              const id = slugify(categoryTitle)
              await onAddCategory({
                id,
                title: categoryTitle.trim(),
                subtitle: 'Personalizada',
                description: categoryDescription.trim() || 'Categoria criada no builder.',
                coverImage: '/assets/covers/builder.svg',
                levels: [],
              })
              setCategoryTitle('')
              setCategoryDescription('')
              setCategoryId(id)
              setFeedback('Categoria salva com sucesso.')
            }}
            className="w-full tracking-[0.14em]"
          >
            Adicionar categoria
          </Button>
        </div>
      )}

      {showLevelSection && (
        <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Novo nivel
          </p>
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            value={levelTitle}
            onChange={(event) => setLevelTitle(event.target.value)}
            placeholder="Titulo do nivel"
          />
          <Input
            value={levelDescription}
            onChange={(event) => setLevelDescription(event.target.value)}
            placeholder="Descricao"
          />
          <Select
            value={levelMode}
            onChange={(event) => setLevelMode(event.target.value as LevelMode)}
            aria-label="Tipo de nivel"
          >
            <option value="quiz" className="bg-slate-900">
              Quiz com perguntas
            </option>
            <option value="blank" className="bg-slate-900">
              Quiz em branco (8 alternativas)
            </option>
          </Select>
          <Select
            value={timingMode}
            onChange={(event) => setTimingMode(event.target.value as TimingMode)}
            aria-label="Modo de tempo"
          >
            <option value="timeless" className="bg-slate-900">
              Sem tempo (Timeless)
            </option>
            <option value="speedrun" className="bg-slate-900">
              Speed Run (pontua por rapidez)
            </option>
          </Select>
          {levelMode === 'quiz' && (
            <Select
              value={answerMode}
              onChange={(event) => setAnswerMode(event.target.value as AnswerMode)}
              aria-label="Formato de resposta"
            >
              <option value="text" className="bg-slate-900">
                Resposta digitada
              </option>
              <option value="choices" className="bg-slate-900">
                Multipla escolha (4 opcoes)
              </option>
            </Select>
          )}
          <Button
            type="button"
            onClick={async () => {
              if (!categoryId || !levelTitle.trim()) return
              await onAddLevel(
                categoryId,
                levelTitle.trim(),
                levelDescription.trim() || 'Novo nivel criado no builder.',
                levelMode,
                timingMode,
                levelMode === 'blank' ? 'text' : answerMode,
              )
              setLevelTitle('')
              setLevelDescription('')
              setFeedback('Nivel criado com sucesso.')
            }}
            className="w-full tracking-[0.14em]"
          >
            Adicionar nivel
          </Button>
        </div>
      )}

      {showAnswerSection && (
        <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Gabarito automatico
          </p>
          <Select
            value={questionCategoryId}
            onChange={(event) => setQuestionCategoryId(event.target.value)}
          >
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={questionLevelId}
            onChange={(event) => setQuestionLevelId(event.target.value)}
          >
            {levelOptions.map((level) => (
              <option key={level.id} value={level.id} className="bg-slate-900">
                {level.title}
              </option>
            ))}
          </Select>

          <Select
            value={questionId}
            onChange={(event) => setQuestionId(event.target.value)}
          >
            {questionOptions.map((question, index) => (
              <option key={question.id} value={question.id} className="bg-slate-900">
                {selectedLevel?.mode === 'blank'
                  ? `Alternativa ${index + 1}`
                  : `Pergunta ${index + 1}`}
              </option>
            ))}
          </Select>

          <Input
            value={questionPrompt}
            onChange={(event) => setQuestionPrompt(event.target.value)}
            placeholder="Texto da pergunta (opcional no modo em branco)"
          />
          <div className="rounded-lg border border-white/15 bg-black/25 p-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
              Imagem da pergunta
            </p>
            {selectedQuestion && (
              <img
                src={questionImagePath || selectedQuestion.imagePath}
                alt="Preview da pergunta"
                className="mb-2 h-20 w-full rounded-xl border border-white/25 object-cover"
              />
            )}
            <Input
              value={questionImagePath}
              onChange={(event) => setQuestionImagePath(event.target.value)}
              placeholder="/assets/cartoons/exemplo.svg"
            />
            <p className="mt-1 text-[10px] text-white/65">
              Informe o path local em /public/assets ou use upload abaixo.
            </p>
            <Textarea
              value={questionImageHint}
              onChange={(event) => setQuestionImageHint(event.target.value)}
              placeholder="Dica de contexto da imagem para IA (ex: personagem, roupa, cena)"
              className="mt-2 h-16 resize-none"
            />
            <label className="mt-2 block cursor-pointer rounded-lg border border-white/30 bg-black/35 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Upload imagem
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file || !questionCategoryId || !questionLevelId || !questionId) return
                  await onUploadQuestionImage({
                    categoryId: questionCategoryId,
                    levelId: questionLevelId,
                    questionId,
                    file,
                  })
                  setFeedback('Imagem enviada com sucesso.')
                  event.target.value = ''
                }}
              />
            </label>
            <Button
              type="button"
              onClick={async () => {
                if (suggestingImages) return
                if (!questionCategoryId || !questionLevelId || !questionId) return

                setSuggestingImages(true)
                try {
                  const suggestions = await onSuggestQuestionImages({
                    categoryId: questionCategoryId,
                    levelId: questionLevelId,
                    questionId,
                    prompt: questionPrompt.trim(),
                    imagePath: questionImagePath.trim() || selectedQuestion?.imagePath || '',
                    imageHint: questionImageHint.trim(),
                  })

                  if (!suggestions || suggestions.length === 0) {
                    setImageSuggestions([])
                    setFeedback(
                      'Nenhuma sugestao encontrada. Ajuste o texto da pergunta ou dica da imagem.',
                    )
                    return
                  }

                  setImageSuggestions(suggestions)
                  setFeedback('Sugestoes de imagem carregadas.')
                } catch (error) {
                  console.error('Falha ao sugerir imagens com IA', error)
                  const details =
                    error instanceof Error && error.message ? ` Detalhes: ${error.message}` : ''
                  setFeedback(
                    `Falha ao buscar sugestoes. Verifique a edge function no Supabase.${details}`,
                  )
                } finally {
                  setSuggestingImages(false)
                }
              }}
              className="mt-2 w-full border-fuchsia-200/40 bg-fuchsia-300/90 text-slate-900"
            >
              {suggestingImages ? 'Buscando imagens...' : 'Sugerir imagens com IA'}
            </Button>
            {imageSuggestions.length > 0 && (
              <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {imageSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="rounded-lg border border-white/20 bg-black/30 p-2"
                  >
                    <img
                      src={suggestion.thumbUrl || suggestion.imageUrl}
                      alt="Sugestao de imagem"
                      className="h-20 w-full rounded-md border border-white/20 object-cover"
                      loading="lazy"
                    />
                    <p className="mt-1 line-clamp-1 text-[10px] uppercase tracking-[0.1em] text-white/70">
                      Fonte: {suggestion.source}
                    </p>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (applyingSuggestionId) return
                        await applyImageSuggestion(suggestion)
                      }}
                      size="sm"
                      className="mt-1 w-full rounded-md border-white/30 bg-white/90 text-slate-900"
                    >
                      {applyingSuggestionId === suggestion.id ? 'Aplicando...' : 'Usar imagem'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedLevel?.answerMode === 'choices' && selectedLevel?.mode !== 'blank' && (
            <div className="space-y-2 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/90">
                Opcoes da multipla escolha (4)
              </p>
              {optionInputs.map((option, optionIndex) => (
                <Input
                  key={`builder-option:${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    optionIndex
                  }`}
                  value={option}
                  onChange={(event) => {
                    setOptionInputs((previous) => {
                      const next = [...previous]
                      next[optionIndex] = event.target.value
                      return next
                    })
                  }}
                  placeholder={`Opcao ${optionIndex + 1}`}
                />
              ))}
              <Select
                value={correctIndex}
                onChange={(event) => setCorrectIndex(Number(event.target.value))}
                aria-label="Indice da alternativa correta"
              >
                <option value={0} className="bg-slate-900">
                  Opcao 1
                </option>
                <option value={1} className="bg-slate-900">
                  Opcao 2
                </option>
                <option value={2} className="bg-slate-900">
                  Opcao 3
                </option>
                <option value={3} className="bg-slate-900">
                  Opcao 4
                </option>
              </Select>
            </div>
          )}
          <Input
            value={correctAnswerDisplay}
            onChange={(event) => setCorrectAnswerDisplay(event.target.value)}
            placeholder="Resposta correta principal"
          />
          <Textarea
            value={acceptedAnswersInput}
            onChange={(event) => setAcceptedAnswersInput(event.target.value)}
            placeholder="Sinonimos aceitos (separe por virgula, ponto e virgula ou quebra de linha)"
            className="h-20 resize-none"
          />

          <Button
            type="button"
            onClick={async () => {
              if (!questionCategoryId || !questionLevelId || !questionId) return

              const normalizedOptions = optionInputs.map((item) => item.trim())
              const resolvedCorrectFromOptions =
                selectedLevel?.answerMode === 'choices'
                  ? (normalizedOptions[correctIndex] ?? '')
                  : ''
              const acceptedAnswers = parseAcceptedAnswers(acceptedAnswersInput)
              const correct = (resolvedCorrectFromOptions || correctAnswerDisplay).trim()
              const hasCorrectAlready = acceptedAnswers.some(
                (item) => item.toLowerCase() === correct.toLowerCase(),
              )

              if (correct && !hasCorrectAlready) {
                acceptedAnswers.unshift(correct)
              }

              const hasAllOptions =
                selectedLevel?.answerMode !== 'choices' ||
                normalizedOptions.every((option) => option.length > 0)

              if (!hasAllOptions) {
                setFeedback('Preencha as 4 opcoes da multipla escolha.')
                return
              }

              await onUpdateQuestion({
                categoryId: questionCategoryId,
                levelId: questionLevelId,
                questionId,
                prompt: questionPrompt.trim(),
                imagePath: questionImagePath.trim() || selectedQuestion?.imagePath || '',
                imageHint: questionImageHint.trim(),
                options: normalizedOptions,
                correctIndex,
                correctAnswerDisplay: correct,
                acceptedAnswers,
              })
              setFeedback('Gabarito atualizado com sucesso.')
            }}
            className="w-full tracking-[0.14em]"
          >
            Salvar gabarito
          </Button>

          {selectedLevel?.mode !== 'blank' &&
            selectedLevel?.answerMode === 'choices' &&
            selectedQuestion && (
              <div className="space-y-2 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/90">
                  Multipla escolha com IA
                </p>
                <Button
                  type="button"
                  disabled={generatingChoices}
                  onClick={async () => {
                    if (!questionCategoryId || !questionLevelId || !questionId) return

                    const normalizedOptions = optionInputs.map((item) => item.trim())
                    const resolvedCorrectFromOptions = normalizedOptions[correctIndex] ?? ''
                    const acceptedAnswers = parseAcceptedAnswers(acceptedAnswersInput)
                    const correct = (resolvedCorrectFromOptions || correctAnswerDisplay).trim()
                    const hasCorrectAlready = acceptedAnswers.some(
                      (item) => item.toLowerCase() === correct.toLowerCase(),
                    )

                    if (!correct || !questionPrompt.trim()) {
                      setFeedback('Preencha pergunta e resposta correta antes de gerar.')
                      return
                    }

                    if (correct && !hasCorrectAlready) {
                      acceptedAnswers.unshift(correct)
                    }

                    setGeneratingChoices(true)
                    try {
                      const generated = await onGenerateQuestionChoices({
                        categoryId: questionCategoryId,
                        levelId: questionLevelId,
                        questionId,
                        prompt: questionPrompt.trim(),
                        imagePath: questionImagePath.trim() || selectedQuestion?.imagePath || '',
                        imageHint: questionImageHint.trim(),
                        correctAnswerDisplay: correct,
                        acceptedAnswers,
                      })

                      if (!generated) {
                        setFeedback('Nao foi possivel gerar opcoes automaticamente.')
                        return
                      }

                      setOptionInputs(generated)
                      const generatedCorrectIndex = generated.findIndex(
                        (option) => option.trim().toLowerCase() === correct.trim().toLowerCase(),
                      )
                      if (generatedCorrectIndex >= 0) {
                        setCorrectIndex(generatedCorrectIndex)
                      }
                      setFeedback('Opcoes geradas e salvas com sucesso.')
                    } catch (error) {
                      console.error('Falha ao gerar opcoes com IA', error)
                      setFeedback(
                        'Falha ao gerar com IA. Verifique deploy da function e GEMINI_API_KEY.',
                      )
                    } finally {
                      setGeneratingChoices(false)
                    }
                  }}
                  className="w-full border-cyan-200/40 bg-cyan-300/90 text-slate-900 disabled:opacity-60"
                >
                  {generatingChoices ? 'Gerando opcoes...' : 'Gerar opcoes com IA'}
                </Button>

                {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-white/20 bg-black/25 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      Opcoes atuais
                    </p>
                    {selectedQuestion.options.map((option, optionIndex) => (
                      <p
                        key={`${selectedQuestion.id}:choice:${optionIndex}`}
                        className="text-xs text-white/90"
                      >
                        {optionIndex + 1}. {option}{' '}
                        {selectedQuestion.correctIndex === optionIndex ? '(correta)' : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      )}
    </aside>
  )
}
