import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type {
  AnswerMode,
  Category,
  LevelMode,
  QuestionImageSuggestion,
  TimingMode,
} from '@/types/quiz'
import { shouldShowQuestionImage } from '@/utils/question-image'
import { useEffect, useMemo, useState } from 'react'

export type BuilderPanelSection = 'category' | 'level' | 'answer'

interface BuilderPanelProps {
  categories: Category[]
  section?: BuilderPanelSection
  onAddCategory: (category: Category) => void | Promise<void>
  onUpdateCategory: (
    categoryId: string,
    categoryTitle: string,
    categoryDescription: string,
  ) => Promise<boolean>
  onAddLevel: (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
    hideDefaultQuestionImage: boolean,
  ) => void | Promise<void>
  onGenerateLevelQuestions: (payload: {
    categoryId: string
    levelId: string
    themeHint: string
    difficulty: 'facil' | 'medio' | 'dificil' | 'insano'
    questionCount: number
  }) => Promise<number | null>
  onImportLevelQuestions: (payload: {
    categoryId: string
    levelId: string
    rawJson: string
  }) => Promise<number | null>
  onUpdateLevel: (
    categoryId: string,
    levelId: string,
    levelTitle: string,
    levelDescription: string,
    hideDefaultQuestionImage: boolean,
  ) => Promise<boolean>
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

const OPTION_SLOT_IDS = ['a', 'b', 'c', 'd'] as const

export const BuilderPanel = ({
  categories,
  section,
  onAddCategory,
  onUpdateCategory,
  onAddLevel,
  onGenerateLevelQuestions,
  onImportLevelQuestions,
  onUpdateLevel,
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
  const [hideDefaultQuestionImage, setHideDefaultQuestionImage] = useState(true)
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
  const [editLevelCategoryId, setEditLevelCategoryId] = useState(categories[0]?.id ?? '')
  const [editLevelId, setEditLevelId] = useState(categories[0]?.levels[0]?.id ?? '')
  const [editLevelTitle, setEditLevelTitle] = useState('')
  const [editLevelDescription, setEditLevelDescription] = useState('')
  const [editHideDefaultQuestionImage, setEditHideDefaultQuestionImage] = useState(true)
  const [editCategoryId, setEditCategoryId] = useState(categories[0]?.id ?? '')
  const [editCategoryTitle, setEditCategoryTitle] = useState('')
  const [editCategoryDescription, setEditCategoryDescription] = useState('')
  const [aiCategoryId, setAiCategoryId] = useState(categories[0]?.id ?? '')
  const [aiLevelId, setAiLevelId] = useState(categories[0]?.levels[0]?.id ?? '')
  const [aiThemeHint, setAiThemeHint] = useState('')
  const [aiDifficulty, setAiDifficulty] = useState<'facil' | 'medio' | 'dificil' | 'insano'>(
    'medio',
  )
  const [aiQuestionCount, setAiQuestionCount] = useState('8')
  const [generatingLevelQuestions, setGeneratingLevelQuestions] = useState(false)
  const [creatorBlindMode, setCreatorBlindMode] = useState(true)
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false)
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false)
  const [createLevelDialogOpen, setCreateLevelDialogOpen] = useState(false)
  const [editLevelDialogOpen, setEditLevelDialogOpen] = useState(false)
  const [aiGenerationDialogOpen, setAiGenerationDialogOpen] = useState(false)
  const [jsonImportDialogOpen, setJsonImportDialogOpen] = useState(false)
  const [importingQuestions, setImportingQuestions] = useState(false)
  const [importCategoryId, setImportCategoryId] = useState(categories[0]?.id ?? '')
  const [importLevelId, setImportLevelId] = useState(categories[0]?.levels[0]?.id ?? '')
  const [importJsonInput, setImportJsonInput] = useState('')
  const [questionEditorDialogOpen, setQuestionEditorDialogOpen] = useState(false)

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ id: category.id, label: category.title })),
    [categories],
  )

  const levelOptions = useMemo(
    () => categories.find((category) => category.id === questionCategoryId)?.levels ?? [],
    [categories, questionCategoryId],
  )
  const editLevelOptions = useMemo(
    () => categories.find((category) => category.id === editLevelCategoryId)?.levels ?? [],
    [categories, editLevelCategoryId],
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
  const selectedEditLevel = useMemo(
    () => editLevelOptions.find((level) => level.id === editLevelId) ?? null,
    [editLevelId, editLevelOptions],
  )
  const selectedEditCategory = useMemo(
    () => categories.find((category) => category.id === editCategoryId) ?? null,
    [categories, editCategoryId],
  )
  const aiLevelOptions = useMemo(
    () => categories.find((category) => category.id === aiCategoryId)?.levels ?? [],
    [aiCategoryId, categories],
  )
  const importLevelOptions = useMemo(
    () => categories.find((category) => category.id === importCategoryId)?.levels ?? [],
    [categories, importCategoryId],
  )
  const levelRows = useMemo(
    () =>
      categories.flatMap((category) =>
        category.levels.map((level) => ({
          categoryId: category.id,
          categoryTitle: category.title,
          level,
        })),
      ),
    [categories],
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

    const nextEditCategoryId = categories.some((category) => category.id === editLevelCategoryId)
      ? editLevelCategoryId
      : categories[0].id

    if (nextEditCategoryId !== editLevelCategoryId) {
      setEditLevelCategoryId(nextEditCategoryId)
    }

    const nextEditLevels =
      categories.find((category) => category.id === nextEditCategoryId)?.levels ?? []
    const nextEditLevelId = nextEditLevels.some((level) => level.id === editLevelId)
      ? editLevelId
      : (nextEditLevels[0]?.id ?? '')

    if (nextEditLevelId !== editLevelId) {
      setEditLevelId(nextEditLevelId)
    }

    const nextEditCategoryIdForCategory = categories.some(
      (category) => category.id === editCategoryId,
    )
      ? editCategoryId
      : categories[0].id
    if (nextEditCategoryIdForCategory !== editCategoryId) {
      setEditCategoryId(nextEditCategoryIdForCategory)
    }

    const nextAiCategoryId = categories.some((category) => category.id === aiCategoryId)
      ? aiCategoryId
      : categories[0].id
    if (nextAiCategoryId !== aiCategoryId) {
      setAiCategoryId(nextAiCategoryId)
    }

    const nextAiLevels =
      categories.find((category) => category.id === nextAiCategoryId)?.levels ?? []
    const nextAiLevelId = nextAiLevels.some((level) => level.id === aiLevelId)
      ? aiLevelId
      : (nextAiLevels[0]?.id ?? '')
    if (nextAiLevelId !== aiLevelId) {
      setAiLevelId(nextAiLevelId)
    }

    const nextImportCategoryId = categories.some((category) => category.id === importCategoryId)
      ? importCategoryId
      : categories[0].id
    if (nextImportCategoryId !== importCategoryId) {
      setImportCategoryId(nextImportCategoryId)
    }

    const nextImportLevels =
      categories.find((category) => category.id === nextImportCategoryId)?.levels ?? []
    const nextImportLevelId = nextImportLevels.some((level) => level.id === importLevelId)
      ? importLevelId
      : (nextImportLevels[0]?.id ?? '')
    if (nextImportLevelId !== importLevelId) {
      setImportLevelId(nextImportLevelId)
    }
  }, [
    categories,
    aiCategoryId,
    aiLevelId,
    importCategoryId,
    importLevelId,
    categoryId,
    editCategoryId,
    editLevelCategoryId,
    editLevelId,
    questionCategoryId,
    questionId,
    questionLevelId,
  ])

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

  useEffect(() => {
    if (!selectedEditLevel) {
      setEditLevelTitle('')
      setEditLevelDescription('')
      setEditHideDefaultQuestionImage(true)
      return
    }

    setEditLevelTitle(selectedEditLevel.title)
    setEditLevelDescription(selectedEditLevel.description)
    setEditHideDefaultQuestionImage(selectedEditLevel.hideDefaultQuestionImage ?? true)
  }, [selectedEditLevel])

  useEffect(() => {
    if (!selectedEditCategory) {
      setEditCategoryTitle('')
      setEditCategoryDescription('')
      return
    }

    setEditCategoryTitle(selectedEditCategory.title)
    setEditCategoryDescription(selectedEditCategory.description)
  }, [selectedEditCategory])

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

  const handleCreateCategory = async () => {
    if (!categoryTitle.trim()) {
      return
    }

    const id = slugify(categoryTitle)
    await onAddCategory({
      id,
      title: categoryTitle.trim(),
      subtitle: 'Personalizada',
      description: categoryDescription.trim(),
      coverImage: '/assets/covers/builder.svg',
      levels: [],
    })

    setCategoryTitle('')
    setCategoryDescription('')
    setCategoryId(id)
    setCreateCategoryDialogOpen(false)
    setFeedback('Categoria salva com sucesso.')
  }

  const handleSaveCategory = async () => {
    if (!editCategoryId || !editCategoryTitle.trim()) {
      return
    }

    const saved = await onUpdateCategory(
      editCategoryId,
      editCategoryTitle.trim(),
      editCategoryDescription.trim(),
    )

    if (saved) {
      setEditCategoryDialogOpen(false)
    }

    setFeedback(
      saved ? 'Categoria atualizada com sucesso.' : 'Nao foi possivel atualizar a categoria.',
    )
  }

  const handleCreateLevel = async () => {
    if (!categoryId || !levelTitle.trim()) {
      return
    }

    await onAddLevel(
      categoryId,
      levelTitle.trim(),
      levelDescription.trim() || 'Novo nivel criado no builder.',
      levelMode,
      timingMode,
      levelMode === 'blank' ? 'text' : answerMode,
      hideDefaultQuestionImage,
    )

    setLevelTitle('')
    setLevelDescription('')
    setHideDefaultQuestionImage(true)
    setCreateLevelDialogOpen(false)
    setFeedback('Nivel criado com sucesso.')
  }

  const handleSaveLevel = async () => {
    if (!editLevelCategoryId || !editLevelId || !editLevelTitle.trim()) {
      return
    }

    const saved = await onUpdateLevel(
      editLevelCategoryId,
      editLevelId,
      editLevelTitle.trim(),
      editLevelDescription.trim(),
      editHideDefaultQuestionImage,
    )

    if (saved) {
      setEditLevelDialogOpen(false)
    }

    setFeedback(saved ? 'Nivel atualizado com sucesso.' : 'Nao foi possivel atualizar o nivel.')
  }

  const handleGenerateLevelQuestionsWithAi = async () => {
    if (!aiCategoryId || !aiLevelId || generatingLevelQuestions) {
      return
    }

    setGeneratingLevelQuestions(true)
    try {
      const total = Number(aiQuestionCount) || 8
      const updatedCount = await onGenerateLevelQuestions({
        categoryId: aiCategoryId,
        levelId: aiLevelId,
        themeHint: aiThemeHint.trim(),
        difficulty: aiDifficulty,
        questionCount: total,
      })

      if (!updatedCount) {
        setFeedback('Nao foi possivel gerar perguntas com IA.')
        return
      }

      setQuestionCategoryId(aiCategoryId)
      setQuestionLevelId(aiLevelId)
      setAiGenerationDialogOpen(false)
      setFeedback(`${updatedCount} perguntas geradas com IA.`)
    } catch (error) {
      console.error('Falha ao gerar perguntas com IA', error)
      setFeedback('Falha ao gerar perguntas. Verifique a edge function.')
    } finally {
      setGeneratingLevelQuestions(false)
    }
  }

  const handleImportQuestionsFromJson = async () => {
    if (!importCategoryId || !importLevelId || importingQuestions) {
      return
    }

    setImportingQuestions(true)
    try {
      const importedCount = await onImportLevelQuestions({
        categoryId: importCategoryId,
        levelId: importLevelId,
        rawJson: importJsonInput,
      })

      if (!importedCount) {
        setFeedback('JSON invalido ou sem perguntas importaveis.')
        return
      }

      setQuestionCategoryId(importCategoryId)
      setQuestionLevelId(importLevelId)
      setImportJsonInput('')
      setJsonImportDialogOpen(false)
      setFeedback(`${importedCount} perguntas importadas com sucesso.`)
    } catch (error) {
      console.error('Falha ao importar perguntas via JSON', error)
      setFeedback('Falha ao importar JSON. Revise o formato esperado.')
    } finally {
      setImportingQuestions(false)
    }
  }

  const handleSuggestImages = async () => {
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
        setFeedback('Nenhuma sugestao encontrada. Ajuste o texto da pergunta ou dica da imagem.')
        return
      }

      setImageSuggestions(suggestions)
      setFeedback('Sugestoes de imagem carregadas.')
    } catch (error) {
      console.error('Falha ao sugerir imagens com IA', error)
      const details = error instanceof Error && error.message ? ` Detalhes: ${error.message}` : ''
      setFeedback(`Falha ao buscar sugestoes. Verifique a edge function no Supabase.${details}`)
    } finally {
      setSuggestingImages(false)
    }
  }

  const handleSaveQuestion = async () => {
    if (!questionCategoryId || !questionLevelId || !questionId) return

    const normalizedOptions = optionInputs.map((item) => item.trim())
    const safeCorrectIndex = creatorBlindMode
      ? (selectedQuestion?.correctIndex ?? correctIndex)
      : correctIndex
    const resolvedCorrectFromOptions =
      selectedLevel?.answerMode === 'choices' ? (normalizedOptions[safeCorrectIndex] ?? '') : ''
    const acceptedAnswers = parseAcceptedAnswers(acceptedAnswersInput)
    const fallbackCorrectFromQuestion = selectedQuestion?.correctAnswerDisplay ?? ''
    const correct = (
      resolvedCorrectFromOptions ||
      correctAnswerDisplay ||
      fallbackCorrectFromQuestion
    ).trim()
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
      correctIndex: safeCorrectIndex,
      correctAnswerDisplay: correct,
      acceptedAnswers,
    })

    setFeedback(
      creatorBlindMode
        ? 'Pergunta atualizada com gabarito oculto.'
        : 'Gabarito atualizado com sucesso.',
    )
  }

  const handleGenerateChoicesWithAi = async () => {
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
      setFeedback('Falha ao gerar com IA. Verifique deploy da function e GEMINI_API_KEY.')
    } finally {
      setGeneratingChoices(false)
    }
  }

  return (
    <aside className="space-y-4 rounded-2xl border border-white/15 bg-black/20 p-4 text-white shadow-xl backdrop-blur-sm lg:p-5">
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
        <div className="space-y-3 rounded-xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Categorias
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateCategoryDialogOpen(true)}
              className="tracking-[0.12em]"
            >
              Nova categoria
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/25">
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead className="w-[110px]">Niveis</TableHead>
                    <TableHead className="w-[120px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-semibold uppercase tracking-[0.08em]">
                        {category.title}
                      </TableCell>
                      <TableCell className="text-white/70">{category.description}</TableCell>
                      <TableCell>{category.levels.length}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditCategoryId(category.id)
                            setEditCategoryTitle(category.title)
                            setEditCategoryDescription(category.description)
                            setEditCategoryDialogOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-white/60">
                        Nenhuma categoria cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {showLevelSection && (
        <div className="space-y-3 rounded-xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Niveis</p>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateLevelDialogOpen(true)}
              className="tracking-[0.12em]"
            >
              Novo nivel
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/25">
            <div className="max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-[95px]">Modo</TableHead>
                    <TableHead className="w-[95px]">Tempo</TableHead>
                    <TableHead className="w-[95px]">Resposta</TableHead>
                    <TableHead className="w-[110px]">Imagem</TableHead>
                    <TableHead className="w-[90px]">Perguntas</TableHead>
                    <TableHead className="w-[110px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levelRows.map((row) => (
                    <TableRow key={`${row.categoryId}:${row.level.id}`}>
                      <TableCell className="font-semibold uppercase tracking-[0.08em]">
                        {row.level.title}
                      </TableCell>
                      <TableCell className="text-white/70">{row.categoryTitle}</TableCell>
                      <TableCell>{row.level.mode ?? 'quiz'}</TableCell>
                      <TableCell>{row.level.timingMode ?? 'timeless'}</TableCell>
                      <TableCell>{row.level.answerMode ?? 'text'}</TableCell>
                      <TableCell>
                        {(row.level.hideDefaultQuestionImage ?? true)
                          ? 'Oculta padrao'
                          : 'Sempre mostra'}
                      </TableCell>
                      <TableCell>{row.level.questions.length}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditLevelCategoryId(row.categoryId)
                            setEditLevelId(row.level.id)
                            setEditLevelTitle(row.level.title)
                            setEditLevelDescription(row.level.description)
                            setEditHideDefaultQuestionImage(
                              row.level.hideDefaultQuestionImage ?? true,
                            )
                            setEditLevelDialogOpen(true)
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {levelRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-white/60">
                        Nenhum nivel cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
            <DialogDescription>Crie a categoria para agrupar niveis e rankings.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateCategoryDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCreateCategory()}>
              Criar categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Atualiza nome e descricao. O ranking e sincronizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-2">
            <Select
              value={editCategoryId}
              onChange={(event) => setEditCategoryId(event.target.value)}
              aria-label="Categoria para editar"
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </Select>
            <Input
              value={editCategoryTitle}
              onChange={(event) => setEditCategoryTitle(event.target.value)}
              placeholder="Novo titulo"
            />
            <Input
              value={editCategoryDescription}
              onChange={(event) => setEditCategoryDescription(event.target.value)}
              placeholder="Nova descricao"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditCategoryDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveCategory()}
              disabled={!editCategoryId || !editCategoryTitle.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createLevelDialogOpen} onOpenChange={setCreateLevelDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo nivel</DialogTitle>
            <DialogDescription>
              Defina formato, tempo e tipo de resposta do nivel.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
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
              className="md:col-span-2"
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
                className="md:col-span-2"
              >
                <option value="text" className="bg-slate-900">
                  Resposta digitada
                </option>
                <option value="choices" className="bg-slate-900">
                  Multipla escolha (4 opcoes)
                </option>
              </Select>
            )}
            <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">
              <input
                type="checkbox"
                checked={hideDefaultQuestionImage}
                onChange={(event) => setHideDefaultQuestionImage(event.target.checked)}
              />
              Ocultar imagem vazia/padrao ao responder
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateLevelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCreateLevel()}>
              Criar nivel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editLevelDialogOpen} onOpenChange={setEditLevelDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar nivel</DialogTitle>
            <DialogDescription>
              Altera titulo e descricao. O ranking e sincronizado com o novo nome.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Select
              value={editLevelCategoryId}
              onChange={(event) => setEditLevelCategoryId(event.target.value)}
              aria-label="Categoria do nivel para editar"
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={editLevelId}
              onChange={(event) => setEditLevelId(event.target.value)}
              aria-label="Nivel para editar"
            >
              {editLevelOptions.map((level) => (
                <option key={level.id} value={level.id} className="bg-slate-900">
                  {level.title}
                </option>
              ))}
            </Select>
            <Input
              value={editLevelTitle}
              onChange={(event) => setEditLevelTitle(event.target.value)}
              placeholder="Novo titulo"
              className="md:col-span-2"
            />
            <Input
              value={editLevelDescription}
              onChange={(event) => setEditLevelDescription(event.target.value)}
              placeholder="Nova descricao"
              className="md:col-span-2"
            />
            <label className="md:col-span-2 flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">
              <input
                type="checkbox"
                checked={editHideDefaultQuestionImage}
                onChange={(event) => setEditHideDefaultQuestionImage(event.target.checked)}
              />
              Ocultar imagem vazia/padrao ao responder
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditLevelDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveLevel()}
              disabled={!editLevelId || !editLevelTitle.trim()}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showAnswerSection && (
        <div className="space-y-3 rounded-xl border border-white/15 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Gabarito
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setAiGenerationDialogOpen(true)}
                className="border-fuchsia-200/40 bg-fuchsia-300/90 text-slate-900"
              >
                IA em lote
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setJsonImportDialogOpen(true)}
              >
                Importar JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!selectedQuestion}
                onClick={() => setQuestionEditorDialogOpen(true)}
              >
                Editar pergunta
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
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

            <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80">
              <input
                type="checkbox"
                checked={creatorBlindMode}
                onChange={(event) => setCreatorBlindMode(event.target.checked)}
              />
              Modo criador cego
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/15 bg-black/25">
            <div className="max-h-[520px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[110px]">Tipo</TableHead>
                    <TableHead>Pergunta</TableHead>
                    <TableHead className="w-[90px]">Imagem</TableHead>
                    <TableHead className="w-[130px]">Gabarito</TableHead>
                    <TableHead className="w-[120px] text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionOptions.map((question, index) => {
                    const isSelected = question.id === questionId
                    const mainAnswer =
                      question.correctAnswerDisplay || question.acceptedAnswers[0] || '-'

                    return (
                      <TableRow
                        key={question.id}
                        className={isSelected ? 'bg-white/10' : undefined}
                        onClick={() => setQuestionId(question.id)}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {selectedLevel?.mode === 'blank' ? 'Alternativa' : 'Pergunta'}
                        </TableCell>
                        <TableCell className="max-w-[440px] truncate">
                          {question.question || question.prompt || '-'}
                        </TableCell>
                        <TableCell>
                          {shouldShowQuestionImage({
                            imagePath: question.imagePath,
                            hideDefaultQuestionImage:
                              selectedLevel?.hideDefaultQuestionImage ?? true,
                          })
                            ? 'Sim'
                            : 'Oculta'}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate">
                          {creatorBlindMode ? 'Oculto' : mainAnswer}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              setQuestionId(question.id)
                              setQuestionEditorDialogOpen(true)
                            }}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {questionOptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-white/60">
                        Nenhuma pergunta encontrada no nivel selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={jsonImportDialogOpen} onOpenChange={setJsonImportDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Importar perguntas via JSON</DialogTitle>
            <DialogDescription>
              Cole o JSON gerado pelo ChatGPT para criar tudo de uma vez no nivel selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Select
              value={importCategoryId}
              onChange={(event) => setImportCategoryId(event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={importLevelId}
              onChange={(event) => setImportLevelId(event.target.value)}
            >
              {importLevelOptions.map((level) => (
                <option key={level.id} value={level.id} className="bg-slate-900">
                  {level.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
              Formato esperado
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/15 bg-black/35 p-2 text-[11px] text-white/80">
              {`{
  "questions": [
    {
      "question": "Qual personagem usa um escudo com estrela?",
      "options": ["Capitao America", "Homem-Aranha", "Thor", "Hulk"],
      "correctAnswer": "Capitao America",
      "acceptedAnswers": ["capitao america", "capitão américa"],
      "imagePath": "/assets/cartoons/capitao.png",
      "imageHint": "heroi com escudo"
    },
    {
      "question": "Pais conhecido como Terra do Sol Nascente",
      "correctAnswer": "Japao",
      "acceptedAnswers": ["japao", "japão"],
      "imagePath": "/assets/cartoons/japao.png"
    }
  ]
}`}
            </pre>
          </div>

          <Textarea
            value={importJsonInput}
            onChange={(event) => setImportJsonInput(event.target.value)}
            placeholder="Cole aqui o JSON completo..."
            className="mt-3 h-64 resize-y"
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setJsonImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleImportQuestionsFromJson()}
              disabled={!importJsonInput.trim() || importingQuestions}
            >
              {importingQuestions ? 'Importando...' : 'Importar perguntas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiGenerationDialogOpen} onOpenChange={setAiGenerationDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Criar perguntas com IA</DialogTitle>
            <DialogDescription>
              Gere perguntas do nivel automaticamente com contexto, dificuldade e quantidade.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Select value={aiCategoryId} onChange={(event) => setAiCategoryId(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={aiLevelId} onChange={(event) => setAiLevelId(event.target.value)}>
              {aiLevelOptions.map((level) => (
                <option key={level.id} value={level.id} className="bg-slate-900">
                  {level.title}
                </option>
              ))}
            </Select>
            <Select
              value={aiDifficulty}
              onChange={(event) =>
                setAiDifficulty(event.target.value as 'facil' | 'medio' | 'dificil' | 'insano')
              }
            >
              <option value="facil" className="bg-slate-900">
                Dificuldade: facil
              </option>
              <option value="medio" className="bg-slate-900">
                Dificuldade: medio
              </option>
              <option value="dificil" className="bg-slate-900">
                Dificuldade: dificil
              </option>
              <option value="insano" className="bg-slate-900">
                Dificuldade: insano
              </option>
            </Select>
            <Input
              value={aiQuestionCount}
              onChange={(event) => setAiQuestionCount(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Quantidade de perguntas (padrao 8)"
              inputMode="numeric"
            />
            <Input
              value={aiThemeHint}
              onChange={(event) => setAiThemeHint(event.target.value)}
              placeholder="Tema/contexto (ex: cultura pop anos 2000, anime, geografia)"
              className="md:col-span-2"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiGenerationDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleGenerateLevelQuestionsWithAi()}
              className="border-fuchsia-200/40 bg-fuchsia-300/90 text-slate-900"
            >
              {generatingLevelQuestions ? 'Gerando perguntas...' : 'Gerar perguntas com IA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionEditorDialogOpen} onOpenChange={setQuestionEditorDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editor de gabarito</DialogTitle>
            <DialogDescription>
              Edite enunciado, imagem, respostas e opcoes da pergunta selecionada.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 max-h-[74vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-2 md:grid-cols-3">
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

              <Select value={questionId} onChange={(event) => setQuestionId(event.target.value)}>
                {questionOptions.map((question, index) => (
                  <option key={question.id} value={question.id} className="bg-slate-900">
                    {selectedLevel?.mode === 'blank'
                      ? `Alternativa ${index + 1}`
                      : `Pergunta ${index + 1}`}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              value={questionPrompt}
              onChange={(event) => setQuestionPrompt(event.target.value)}
              placeholder="Texto da pergunta (opcional no modo em branco)"
            />

            <div className="rounded-lg border border-white/15 bg-black/25 p-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                Imagem da pergunta
              </p>
              {selectedQuestion &&
                shouldShowQuestionImage({
                  imagePath: questionImagePath || selectedQuestion.imagePath,
                  hideDefaultQuestionImage: selectedLevel?.hideDefaultQuestionImage ?? true,
                }) && (
                  <img
                    src={questionImagePath || selectedQuestion.imagePath}
                    alt="Preview da pergunta"
                    className="mb-2 h-24 w-full rounded-xl border border-white/25 object-cover"
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
                onClick={() => void handleSuggestImages()}
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
                {OPTION_SLOT_IDS.map((slotId, optionIndex) => (
                  <Input
                    key={`builder-option:${slotId}`}
                    value={optionInputs[optionIndex] ?? ''}
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
                {creatorBlindMode ? (
                  <p className="rounded-lg border border-white/20 bg-black/25 px-2 py-2 text-[11px] text-white/75">
                    Gabarito oculto no modo criador cego.
                  </p>
                ) : (
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
                )}
              </div>
            )}

            {!creatorBlindMode && (
              <>
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
              </>
            )}

            {!creatorBlindMode &&
              selectedLevel?.mode !== 'blank' &&
              selectedLevel?.answerMode === 'choices' &&
              selectedQuestion && (
                <div className="space-y-2 rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100/90">
                    Multipla escolha com IA
                  </p>
                  <Button
                    type="button"
                    disabled={generatingChoices}
                    onClick={() => void handleGenerateChoicesWithAi()}
                    className="w-full border-cyan-200/40 bg-cyan-300/90 text-slate-900 disabled:opacity-60"
                  >
                    {generatingChoices ? 'Gerando opcoes...' : 'Gerar opcoes com IA'}
                  </Button>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuestionEditorDialogOpen(false)}
            >
              Fechar
            </Button>
            <Button type="button" onClick={() => void handleSaveQuestion()}>
              {creatorBlindMode ? 'Salvar pergunta' : 'Salvar gabarito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
