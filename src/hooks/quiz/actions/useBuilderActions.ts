import type { ChangeEvent, Dispatch, SetStateAction } from 'react'

import {
  deleteRemoteLevel,
  generateRemoteQuestionChoices,
  suggestRemoteQuestionImages,
  updateRemoteQuestionImage,
  uploadRemoteAsset,
  upsertRemoteCategory,
  upsertRemoteLevel,
} from '@/services/supabase'
import type {
  AnswerMode,
  Category,
  Level,
  LevelMode,
  QuestionImageSuggestion,
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
}

export const useBuilderActions = (params: UseBuilderActionsParams) => {
  const {
    categories,
    selectedCategory,
    selectedLevel,
    remoteEnabled,
    setFrameImage,
    setUploadedImages,
    setCategories,
  } = params

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

  const handleAddLevel = (
    categoryId: string,
    levelTitle: string,
    levelDescription: string,
    mode: LevelMode,
    timingMode: TimingMode,
    answerMode: AnswerMode,
  ) => {
    const newLevel = createEmptyLevel(levelTitle, levelDescription, mode, timingMode, answerMode)
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

  const handleUpdateLevel = async (
    categoryId: string,
    levelId: string,
    levelTitle: string,
    levelDescription: string,
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

    if (!remoteEnabled) {
      return true
    }

    await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))
    return true
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
    handleAddLevel,
    handleUpdateLevel,
    handleDeleteLevel,
    handleToggleLevelPublished,
    handleUpdateQuestion,
    handleGenerateQuestionChoices,
    handleSuggestQuestionImages,
  }
}
