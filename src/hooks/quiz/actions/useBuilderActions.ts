import type { ChangeEvent, Dispatch, SetStateAction } from 'react'

import {
  updateRemoteQuestionImage,
  uploadRemoteAsset,
  upsertRemoteCategory,
  upsertRemoteLevel,
} from '@/services/supabase'
import type { Category, Level, LevelMode } from '@/types/quiz'
import { createEmptyLevel } from '@/utils/builder'

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

  const handleQuestionImageUpload = async (questionId: string, file: File) => {
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

    if (!remoteEnabled || !selectedCategory || !selectedLevel) {
      return
    }

    const extension = getFileExtension(file.name)
    const remotePath = `questions/${selectedCategory.id}/${selectedLevel.id}/${questionId}.${extension}`
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
        if (category.id !== selectedCategory.id) {
          return category
        }

        return {
          ...category,
          levels: category.levels.map((level) => {
            if (level.id !== selectedLevel.id) {
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
  ) => {
    const newLevel = createEmptyLevel(levelTitle, levelDescription, mode)
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

  return {
    handleBackgroundUpload,
    handleQuestionImageUpload,
    handleAddCategory,
    handleAddLevel,
    handleUpdateQuestion,
  }
}
