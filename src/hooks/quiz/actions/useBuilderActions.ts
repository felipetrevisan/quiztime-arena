import type { ChangeEvent, Dispatch, SetStateAction } from 'react'

import {
  deleteRemoteLevel,
  generateRemoteQuestionChoices,
  updateRemoteQuestionImage,
  uploadRemoteAsset,
  upsertRemoteCategory,
  upsertRemoteLevel,
} from '@/services/supabase'
import type { AnswerMode, Category, Level, LevelMode, TimingMode } from '@/types/quiz'
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
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }) => {
    const { categoryId, levelId, questionId, prompt, correctAnswerDisplay, acceptedAnswers } =
      payload

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
              prompt,
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
    correctAnswerDisplay: string
    acceptedAnswers: string[]
  }): Promise<string[] | null> => {
    const { categoryId, levelId, questionId, prompt, correctAnswerDisplay } = payload
    const normalizedAccepted = payload.acceptedAnswers.map((item) => item.trim()).filter(Boolean)
    const promptValue = prompt.trim()
    const correctValue = correctAnswerDisplay.trim()

    if (!remoteEnabled || !promptValue || !correctValue) {
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

    const generatedOptions = await generateRemoteQuestionChoices({
      categoryTitle: currentCategory.title,
      levelTitle: currentLevel.title,
      questionPrompt: promptValue,
      correctAnswer: correctValue,
      acceptedAnswers,
    })

    if (!generatedOptions) {
      return null
    }

    const normalizedCorrect = normalizeAnswer(correctValue)
    const wrongOptions = generatedOptions
      .map((option) => option.trim())
      .filter(Boolean)
      .filter((option, index, options) => {
        const normalizedOption = normalizeAnswer(option)
        return options.findIndex((item) => normalizeAnswer(item) === normalizedOption) === index
      })
      .filter((option) => normalizeAnswer(option) !== normalizedCorrect)
      .slice(0, 3)

    if (wrongOptions.length < 3) {
      return null
    }

    const nextChoiceOptions = [correctValue, ...wrongOptions].sort(() => Math.random() - 0.5)
    const nextLevel = {
      ...currentLevel,
      questions: currentLevel.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              prompt: promptValue,
              correctAnswerDisplay: correctValue,
              acceptedAnswers,
              choiceOptions: nextChoiceOptions,
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

    await upsertRemoteLevel(categoryId, nextLevel, Math.max(levelPosition, 0))

    return nextChoiceOptions
  }

  return {
    handleBackgroundUpload,
    handleQuestionImageUpload,
    handleAddCategory,
    handleAddLevel,
    handleDeleteLevel,
    handleToggleLevelPublished,
    handleUpdateQuestion,
    handleGenerateQuestionChoices,
  }
}
