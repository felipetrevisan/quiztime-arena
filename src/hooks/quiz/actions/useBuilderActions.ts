import type { ChangeEvent, Dispatch, SetStateAction } from 'react'

import {
  deleteRemoteLevel,
  generateRemoteLevelQuestions,
  generateRemoteQuestionChoices,
  suggestRemoteQuestionImages,
  updateRemoteCategoryTitleInRankings,
  updateRemoteLevelTitleInRankings,
  updateRemoteQuestionImage,
  uploadRemoteAsset,
  upsertRemoteCategory,
  upsertRemoteLevel,
} from '@/services/supabase'
import type {
  AnswerMode,
  Category,
  GeneratedLevelQuestion,
  Level,
  LevelMode,
  QuestionImageSuggestion,
  RankingEntry,
  TimingMode,
} from '@/types/quiz'
import { createEmptyLevel } from '@/utils/builder'
import { normalizeAnswer } from '@/utils/normalize'

import { getUniqueCategoryId } from '../shared'
import { getFileExtension } from './shared'

interface UseBuilderActionsParams {
  categories: Category[]
  selectedCategory: Category | null
  selectedLevel: Level | null
  remoteEnabled: boolean
  setFrameImage: Dispatch<SetStateAction<string | null>>
  setUploadedImages: Dispatch<SetStateAction<Record<string, string>>>
  setCategories: Dispatch<SetStateAction<Category[]>>
  setRankings: Dispatch<SetStateAction<RankingEntry[]>>
}

const parseJsonBlock = (raw: string): unknown | null => {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (!cleaned) {
    return null
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

const toStringValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : typeof value === 'string'
      ? value
          .split(/[\n,;]+/g)
          .map((item) => item.trim())
          .filter(Boolean)
      : []

export const useBuilderActions = (params: UseBuilderActionsParams) => {
  const {
    categories,
    selectedCategory,
    selectedLevel,
    remoteEnabled,
    setFrameImage,
    setUploadedImages,
    setCategories,
    setRankings,
  } = params

  const normalizeLabel = (value: string): string => value.trim().toLowerCase()

  const buildChoicesFromGeneratedQuestion = (generated: GeneratedLevelQuestion): string[] => {
    const correct = generated.correctAnswer.trim()
    const normalizedCorrect = normalizeAnswer(correct)
    const options = (generated.options ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
      .filter(
        (item, index, values) =>
          values.findIndex((candidate) => normalizeAnswer(candidate) === normalizeAnswer(item)) ===
          index,
      )

    const wrong = options.filter((item) => normalizeAnswer(item) !== normalizedCorrect).slice(0, 3)

    const fallbackWrong = [
      `Nao e ${correct}`,
      'Alternativa incorreta A',
      'Alternativa incorreta B',
      'Alternativa incorreta C',
    ]

    for (const item of fallbackWrong) {
      if (wrong.length >= 3) {
        break
      }

      const normalized = normalizeAnswer(item)
      if (
        normalized &&
        normalized !== normalizedCorrect &&
        !wrong.some((candidate) => normalizeAnswer(candidate) === normalized)
      ) {
        wrong.push(item)
      }
    }

    const mixed = [...wrong.slice(0, 3), correct]
    return mixed.sort(() => Math.random() - 0.5)
  }

  const shuffle = <T>(items: T[]): T[] => {
    const next = [...items]
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const current = next[index]
      next[index] = next[swapIndex]
      next[swapIndex] = current
    }
    return next
  }

  const buildLocalChoiceFallback = (params: {
    level: Level
    questionId: string
    correctAnswer: string
  }): string[] => {
    const { level, questionId, correctAnswer } = params
    const normalizedCorrect = normalizeAnswer(correctAnswer)

    const candidates = level.questions
      .filter((question) => question.id !== questionId)
      .map((question) => {
        const byIndex =
          question.options?.[question.correctIndex >= 0 ? question.correctIndex : 0] ?? ''
        return (
          question.correctAnswerDisplay?.trim() || question.acceptedAnswers?.[0]?.trim() || byIndex
        )
      })
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value, index, values) => {
        const normalized = normalizeAnswer(value)
        return values.findIndex((item) => normalizeAnswer(item) === normalized) === index
      })
      .filter((value) => normalizeAnswer(value) !== normalizedCorrect)

    const wrong = shuffle(candidates).slice(0, 3)

    const fallbackWrong = ['Opcao A', 'Opcao B', 'Opcao C', 'Opcao D', 'Opcao E', 'Opcao F']
    for (const item of fallbackWrong) {
      if (wrong.length >= 3) {
        break
      }
      const normalized = normalizeAnswer(item)
      if (
        normalized !== normalizedCorrect &&
        !wrong.some((candidate) => normalizeAnswer(candidate) === normalized)
      ) {
        wrong.push(item)
      }
    }

    return shuffle([correctAnswer, ...wrong.slice(0, 3)])
  }

  const handleImportLevelQuestions = async (payload: {
    categoryId: string
    levelId: string
    rawJson: string
  }): Promise<number | null> => {
    const { categoryId, levelId, rawJson } = payload
    const category = categories.find((item) => item.id === categoryId)
    const level = category?.levels.find((item) => item.id === levelId)
    const levelPosition = category?.levels.findIndex((item) => item.id === levelId) ?? -1

    if (!category || !level) {
      return null
    }

    const parsed = parseJsonBlock(rawJson)
    if (!parsed) {
      return null
    }

    const root = parsed as Record<string, unknown>
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(root.questions)
        ? root.questions
        : []

    if (items.length === 0) {
      return null
    }

    const isChoiceLevel = level.answerMode === 'choices' && level.mode !== 'blank'
    const nextQuestions = items
      .map((item, index): Level['questions'][number] | null => {
        if (!item || typeof item !== 'object') {
          return null
        }

        const record = item as Record<string, unknown>
        const current = level.questions[index]

        const prompt =
          toStringValue(record.prompt) ||
          toStringValue(record.question) ||
          toStringValue(record.title) ||
          current?.prompt ||
          current?.question ||
          `Pergunta ${index + 1}`

        const imagePath =
          toStringValue(record.imagePath) ||
          toStringValue(record.image) ||
          toStringValue(record.imageUrl) ||
          current?.imagePath ||
          '/assets/cartoons/template.svg'
        const imageHint = toStringValue(record.imageHint) || current?.imageHint || ''

        const rawOptions = [
          ...toStringArray(record.options ?? record.choices ?? record.alternatives),
          toStringValue(record.option1),
          toStringValue(record.option2),
          toStringValue(record.option3),
          toStringValue(record.option4),
          toStringValue(record.a),
          toStringValue(record.b),
          toStringValue(record.c),
          toStringValue(record.d),
        ].filter(Boolean)
        const indexedCorrect =
          typeof record.correctIndex === 'number' && Number.isFinite(record.correctIndex)
            ? record.correctIndex
            : null

        const explicitCorrect =
          toStringValue(record.correctAnswerDisplay) ||
          toStringValue(record.correctAnswer) ||
          toStringValue(record.correct) ||
          toStringValue(record.answer)

        const acceptedFromJson = toStringArray(record.acceptedAnswers)

        if (isChoiceLevel) {
          const uniqueOptions = rawOptions.filter(
            (option, optionIndex, options) =>
              options.findIndex(
                (candidate) => normalizeAnswer(candidate) === normalizeAnswer(option),
              ) === optionIndex,
          )

          let correctAnswer =
            explicitCorrect ||
            (indexedCorrect !== null && indexedCorrect >= 0 && indexedCorrect < uniqueOptions.length
              ? uniqueOptions[indexedCorrect]
              : '') ||
            uniqueOptions[0] ||
            `Resposta ${index + 1}`

          const normalizedCorrect = normalizeAnswer(correctAnswer)
          const deduped = uniqueOptions.filter(Boolean)

          const ensured = deduped.some((option) => normalizeAnswer(option) === normalizedCorrect)
            ? deduped
            : [correctAnswer, ...deduped]

          const wrong = ensured
            .filter((option) => normalizeAnswer(option) !== normalizedCorrect)
            .slice(0, 3)

          const fallbackWrong = [
            'Alternativa incorreta A',
            'Alternativa incorreta B',
            'Alternativa incorreta C',
            'Alternativa incorreta D',
          ]
          for (const fallback of fallbackWrong) {
            if (wrong.length >= 3) {
              break
            }
            const normalizedFallback = normalizeAnswer(fallback)
            if (
              normalizedFallback !== normalizedCorrect &&
              !wrong.some((option) => normalizeAnswer(option) === normalizedFallback)
            ) {
              wrong.push(fallback)
            }
          }

          const options = [correctAnswer, ...wrong.slice(0, 3)]
          const correctIndex = Math.max(
            0,
            options.findIndex((option) => normalizeAnswer(option) === normalizedCorrect),
          )
          correctAnswer = options[correctIndex] ?? correctAnswer

          const acceptedAnswers = [correctAnswer, ...acceptedFromJson].filter(
            (answer, answerIndex, answers) =>
              answers.findIndex(
                (candidate) => normalizeAnswer(candidate) === normalizeAnswer(answer),
              ) === answerIndex,
          )

          return {
            id: current?.id ?? `custom-q-${crypto.randomUUID()}`,
            question: prompt,
            prompt,
            imagePath,
            imageHint,
            options,
            correctIndex,
            acceptedAnswers,
            correctAnswerDisplay: correctAnswer,
          }
        }

        const correctAnswer =
          explicitCorrect ||
          acceptedFromJson[0] ||
          current?.correctAnswerDisplay ||
          `Resposta ${index + 1}`
        const acceptedAnswers = [correctAnswer, ...acceptedFromJson]
          .filter(Boolean)
          .filter(
            (answer, answerIndex, answers) =>
              answers.findIndex(
                (candidate) => normalizeAnswer(candidate) === normalizeAnswer(answer),
              ) === answerIndex,
          )

        return {
          id: current?.id ?? `custom-q-${crypto.randomUUID()}`,
          question: prompt,
          prompt,
          imagePath,
          imageHint,
          options: current?.options ?? ['Opcao 1', 'Opcao 2', 'Opcao 3', 'Opcao 4'],
          correctIndex: current?.correctIndex ?? 0,
          acceptedAnswers,
          correctAnswerDisplay: correctAnswer,
        }
      })
      .filter((question): question is Level['questions'][number] => Boolean(question))

    if (nextQuestions.length === 0) {
      return null
    }

    const nextLevel: Level = {
      ...level,
      questions: nextQuestions,
    }

    setCategories((previous) =>
      previous.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              levels: item.levels.map((candidate) =>
                candidate.id === levelId ? nextLevel : candidate,
              ),
            }
          : item,
      ),
    )

    if (remoteEnabled) {
      await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    }

    return nextQuestions.length
  }

  const handleBackgroundUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const url = URL.createObjectURL(file)
    setFrameImage((previous) => {
      if (previous?.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return url
    })
    event.target.value = ''
  }

  const handleQuestionImageUpload = async (
    questionId: string,
    file: File,
    options?: { categoryId: string; levelId: string },
  ) => {
    const targetCategoryId = options?.categoryId ?? selectedCategory?.id
    const targetLevelId = options?.levelId ?? selectedLevel?.id
    const targetCategory =
      categories.find((category) => category.id === targetCategoryId) ?? selectedCategory
    const targetLevel =
      targetCategory?.levels.find((level) => level.id === targetLevelId) ?? selectedLevel

    if (!targetCategory || !targetLevel) {
      return
    }

    const localUrl = URL.createObjectURL(file)

    setUploadedImages((previous) => {
      const oldUrl = previous[questionId]
      if (oldUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl)
      }

      return {
        ...previous,
        [questionId]: localUrl,
      }
    })

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== targetCategory.id) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => {
            if (level.id !== targetLevel.id) {
              return level
            }

            return {
              ...level,
              questions: level.questions.map((question) =>
                question.id === questionId ? { ...question, imagePath: localUrl } : question,
              ),
            }
          }),
        }
      }),
    )

    if (!remoteEnabled) {
      return
    }

    const extension = getFileExtension(file.name)
    const remotePath = `questions/${targetCategory.id}/${targetLevel.id}/${questionId}.${extension}`
    const remoteUrl = await uploadRemoteAsset(file, remotePath)

    if (!remoteUrl) {
      return
    }

    await updateRemoteQuestionImage(questionId, remoteUrl)

    setUploadedImages((previous) => {
      const previousUrl = previous[questionId]
      if (previousUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl)
      }

      return {
        ...previous,
        [questionId]: remoteUrl,
      }
    })

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== targetCategory.id) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => {
            if (level.id !== targetLevel.id) {
              return level
            }

            return {
              ...level,
              questions: level.questions.map((question) =>
                question.id === questionId ? { ...question, imagePath: remoteUrl } : question,
              ),
            }
          }),
        }
      }),
    )
  }

  const handleAddCategory = async (category: Category) => {
    const uniqueId = getUniqueCategoryId(categories, category.id)
    const nextCategory = { ...category, id: uniqueId }

    setCategories((previous) => [...previous, nextCategory])

    if (remoteEnabled) {
      await upsertRemoteCategory(nextCategory, categories.length)
    }
  }

  const handleUpdateCategory = async (
    categoryId: string,
    categoryTitle: string,
    categoryDescription: string,
  ): Promise<boolean> => {
    const currentCategory = categories.find((category) => category.id === categoryId)
    const categoryPosition = categories.findIndex((category) => category.id === categoryId)
    const nextTitle = categoryTitle.trim()

    if (!currentCategory || !nextTitle) {
      return false
    }

    const nextCategory: Category = {
      ...currentCategory,
      title: nextTitle,
      description: categoryDescription.trim() || currentCategory.description,
    }

    setCategories((previous) =>
      previous.map((category) => (category.id === categoryId ? nextCategory : category)),
    )

    const previousTitleNormalized = normalizeLabel(currentCategory.title)
    setRankings((previous) =>
      previous.map((entry) => {
        const matchesById = entry.categoryId === categoryId
        const matchesLegacy =
          !entry.categoryId && normalizeLabel(entry.categoryTitle) === previousTitleNormalized

        if (!matchesById && !matchesLegacy) {
          return entry
        }

        return {
          ...entry,
          categoryTitle: nextTitle,
        }
      }),
    )

    if (!remoteEnabled) {
      return true
    }

    await upsertRemoteCategory(nextCategory, Math.max(categoryPosition, 0))
    const syncedRankings = await updateRemoteCategoryTitleInRankings({
      categoryId,
      previousTitle: currentCategory.title,
      nextTitle,
    })

    return syncedRankings
  }

  const handleAddLevel = (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
    hideDefaultQuestionImage: boolean,
  ) => {
    const newLevel = createEmptyLevel(
      levelTitle,
      levelDescription,
      mode,
      timingMode,
      answerMode,
      hideDefaultQuestionImage,
    )
    const currentCategory = categories.find((category) => category.id === categoryId)
    const levelPosition = currentCategory?.levels.length ?? 0

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: [...category.levels, newLevel],
        }
      }),
    )

    if (remoteEnabled) {
      void upsertRemoteLevel(categoryId, newLevel, levelPosition)
    }
  }

  const handleGenerateLevelQuestions = async (payload: {
    categoryId: string
    levelId: string
    themeHint: string
    difficulty: 'facil' | 'medio' | 'dificil' | 'insano'
    questionCount: number
  }): Promise<number | null> => {
    const { categoryId, levelId, themeHint, difficulty, questionCount } = payload
    const currentCategory = categories.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1

    if (!currentCategory || !currentLevel || questionCount < 1) {
      return null
    }

    if (!remoteEnabled) {
      return null
    }

    const generated = await generateRemoteLevelQuestions({
      categoryTitle: currentCategory.title,
      levelTitle: currentLevel.title,
      levelDescription: currentLevel.description,
      levelMode: currentLevel.mode ?? 'quiz',
      answerMode:
        currentLevel.mode === 'blank'
          ? 'text'
          : ((currentLevel.answerMode ?? 'text') as AnswerMode),
      questionCount: Math.min(Math.max(questionCount, 1), currentLevel.questions.length),
      themeHint: themeHint.trim(),
      difficulty,
    })

    if (!generated || generated.length === 0) {
      return null
    }

    const limited = generated.slice(0, currentLevel.questions.length)
    const nextLevel: Level = {
      ...currentLevel,
      questions: currentLevel.questions.map((question, index) => {
        const suggestion = limited[index]
        if (!suggestion) {
          return question
        }

        const correct = suggestion.correctAnswer.trim()
        const normalizedAccepted = suggestion.acceptedAnswers
          .map((answer) => answer.trim())
          .filter(Boolean)
        const hasCorrectAnswer = normalizedAccepted.some(
          (answer) => normalizeAnswer(answer) === normalizeAnswer(correct),
        )
        const acceptedAnswers = hasCorrectAnswer
          ? normalizedAccepted
          : [correct, ...normalizedAccepted]
        const options =
          currentLevel.answerMode === 'choices' && currentLevel.mode !== 'blank'
            ? buildChoicesFromGeneratedQuestion(suggestion)
            : question.options
        const correctIndex =
          currentLevel.answerMode === 'choices' && currentLevel.mode !== 'blank'
            ? Math.max(
                0,
                options.findIndex((item) => normalizeAnswer(item) === normalizeAnswer(correct)),
              )
            : question.correctIndex

        return {
          ...question,
          question: suggestion.prompt,
          prompt: suggestion.prompt,
          imageHint: suggestion.imageHint || question.imageHint || '',
          correctAnswerDisplay: correct,
          acceptedAnswers,
          options,
          correctIndex,
        }
      }),
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    return limited.length
  }

  const handleUpdateLevel = async (
    categoryId: string,
    levelId: string,
    levelTitle: string,
    levelDescription: string,
    hideDefaultQuestionImage: boolean,
  ): Promise<boolean> => {
    const currentCategory = categories.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1

    if (!currentCategory || !currentLevel || !levelTitle.trim()) {
      return false
    }

    const nextLevel: Level = {
      ...currentLevel,
      title: levelTitle.trim(),
      description: levelDescription.trim() || currentLevel.description,
      hideDefaultQuestionImage,
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    const previousLevelTitleNormalized = normalizeLabel(currentLevel.title)
    const previousCategoryTitleNormalized = normalizeLabel(currentCategory.title)
    setRankings((previous) =>
      previous.map((entry) => {
        const matchesByLevelId = entry.levelId === levelId
        const matchesLegacy =
          !entry.levelId &&
          normalizeLabel(entry.levelTitle) === previousLevelTitleNormalized &&
          (entry.categoryId === categoryId ||
            (!entry.categoryId &&
              normalizeLabel(entry.categoryTitle) === previousCategoryTitleNormalized))

        if (!matchesByLevelId && !matchesLegacy) {
          return entry
        }

        return {
          ...entry,
          levelTitle: nextLevel.title,
        }
      }),
    )

    if (!remoteEnabled) {
      return true
    }

    await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    const syncedRankings = await updateRemoteLevelTitleInRankings({
      categoryId,
      levelId,
      previousCategoryTitle: currentCategory.title,
      previousTitle: currentLevel.title,
      nextTitle: nextLevel.title,
    })
    return syncedRankings
  }

  const handleDeleteLevel = async (categoryId: string, levelId: string): Promise<boolean> => {
    const currentCategory = categories.find((category) => category.id === categoryId)
    if (!currentCategory) {
      return false
    }

    const hasLevel = currentCategory.levels.some((level) => level.id === levelId)
    if (!hasLevel) {
      return false
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }
        return {
          ...category,
          levels: category.levels.filter((level) => level.id !== levelId),
        }
      }),
    )

    if (!remoteEnabled) {
      return true
    }

    return deleteRemoteLevel(levelId)
  }

  const handleToggleLevelPublished = async (
    categoryId: string,
    levelId: string,
    nextPublished: boolean,
  ): Promise<boolean> => {
    const currentCategory = categories.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1

    if (!currentCategory || !currentLevel) {
      return false
    }

    const nextLevel = { ...currentLevel, isPublished: nextPublished }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }
        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    if (!remoteEnabled) {
      return true
    }

    await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    return true
  }

  const handleUpdateQuestion = async (payload: {
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
  }) => {
    const {
      categoryId,
      levelId,
      questionId,
      prompt,
      imagePath,
      imageHint,
      options,
      correctIndex,
      correctAnswerDisplay,
      acceptedAnswers,
    } = payload

    const currentCategory = categories.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1

    if (!currentCategory || !currentLevel) {
      return
    }

    const nextLevel = {
      ...currentLevel,
      questions: currentLevel.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              question: prompt,
              prompt,
              imagePath,
              imageHint,
              options,
              correctIndex,
              correctAnswerDisplay,
              acceptedAnswers,
            }
          : question,
      ),
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    if (remoteEnabled) {
      await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    }
  }

  const handleGenerateQuestionChoices = async (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }): Promise<string[] | null> => {
    const { categoryId, levelId, questionId, prompt, imagePath, imageHint, correctAnswerDisplay } =
      payload
    const normalizedAccepted = payload.acceptedAnswers.map((item) => item.trim()).filter(Boolean)
    const promptValue = prompt.trim()
    const correctValue = correctAnswerDisplay.trim()

    if (!promptValue || !correctValue) {
      return null
    }

    const hasCorrect = normalizedAccepted.some(
      (answer) => normalizeAnswer(answer) === normalizeAnswer(correctValue),
    )
    const acceptedAnswers = hasCorrect ? normalizedAccepted : [correctValue, ...normalizedAccepted]

    const currentCategory = categories.find((category) => category.id === categoryId)
    const currentLevel = currentCategory?.levels.find((level) => level.id === levelId)
    const levelPosition = currentCategory?.levels.findIndex((level) => level.id === levelId) ?? -1
    const currentQuestion = currentLevel?.questions.find((question) => question.id === questionId)

    if (!currentCategory || !currentLevel || !currentQuestion) {
      return null
    }

    const generatedOptions = remoteEnabled
      ? await generateRemoteQuestionChoices({
          categoryTitle: currentCategory.title,
          levelTitle: currentLevel.title,
          questionTitle: currentQuestion.question || currentQuestion.prompt,
          questionPrompt: promptValue,
          imagePath: imagePath || currentQuestion.imagePath,
          imageHint: imageHint || currentQuestion.imageHint || '',
          correctAnswer: correctValue,
          acceptedAnswers,
        })
      : null

    const rawOptions =
      generatedOptions ??
      buildLocalChoiceFallback({
        level: currentLevel,
        questionId,
        correctAnswer: correctValue,
      })

    const normalizedCorrect = normalizeAnswer(correctValue)
    const wrongOptions = rawOptions
      .map((option) => option.trim())
      .filter(Boolean)
      .filter((option, index, options) => {
        const normalizedOption = normalizeAnswer(option)
        return options.findIndex((item) => normalizeAnswer(item) === normalizedOption) === index
      })
      .filter((option) => normalizeAnswer(option) !== normalizedCorrect)
      .slice(0, 3)

    if (wrongOptions.length < 3) {
      const complement = ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D']
      for (const item of complement) {
        if (wrongOptions.length >= 3) {
          break
        }
        const normalized = normalizeAnswer(item)
        if (
          normalized !== normalizedCorrect &&
          !wrongOptions.some((option) => normalizeAnswer(option) === normalized)
        ) {
          wrongOptions.push(item)
        }
      }
    }

    const nextChoiceOptions = [correctValue, ...wrongOptions].sort(() => Math.random() - 0.5)
    const generatedCorrectIndex = Math.max(
      0,
      nextChoiceOptions.findIndex((option) => normalizeAnswer(option) === normalizedCorrect),
    )
    const nextLevel = {
      ...currentLevel,
      questions: currentLevel.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              question: promptValue,
              prompt: promptValue,
              imageHint: imageHint || currentQuestion.imageHint || '',
              correctAnswerDisplay: correctValue,
              acceptedAnswers,
              options: nextChoiceOptions,
              correctIndex: generatedCorrectIndex,
            }
          : question,
      ),
    }

    setCategories((previous) =>
      previous.map((category) => {
        if (category.id !== categoryId) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => (level.id === levelId ? nextLevel : level)),
        }
      }),
    )

    if (remoteEnabled) {
      await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    }

    return nextChoiceOptions
  }

  const handleSuggestQuestionImages = async (payload: {
    categoryId: string
    levelId: string
    questionId: string
    prompt: string
    imagePath: string
    imageHint: string
  }): Promise<QuestionImageSuggestion[] | null> => {
    if (!remoteEnabled) {
      return null
    }

    const { categoryId, levelId, questionId, prompt, imagePath, imageHint } = payload
    const category = categories.find((item) => item.id === categoryId)
    const level = category?.levels.find((item) => item.id === levelId)
    const question = level?.questions.find((item) => item.id === questionId)

    if (!category || !level || !question) {
      return null
    }

    const questionPrompt = prompt.trim() || question.prompt || question.question
    const questionHint = imageHint.trim() || question.imageHint || ''
    const questionImagePath = imagePath.trim() || question.imagePath || ''

    if (!questionPrompt && !questionHint) {
      return null
    }

    return suggestRemoteQuestionImages({
      categoryTitle: category.title,
      levelTitle: level.title,
      questionTitle: question.question || question.prompt,
      questionPrompt,
      imageHint: questionHint,
      imagePath: questionImagePath,
      limit: 8,
    })
  }

  return {
    handleBackgroundUpload,
    handleQuestionImageUpload,
    handleAddCategory,
    handleUpdateCategory,
    handleAddLevel,
    handleGenerateLevelQuestions,
    handleImportLevelQuestions,
    handleUpdateLevel,
    handleDeleteLevel,
    handleToggleLevelPublished,
    handleUpdateQuestion,
    handleGenerateQuestionChoices,
    handleSuggestQuestionImages,
  }
}
