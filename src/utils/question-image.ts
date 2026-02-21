const DEFAULT_QUESTION_IMAGE_FILE_PATTERNS = [
  'template',
  'default',
  'placeholder',
  'avatar-default',
]

const getFileName = (path: string): string => {
  const withoutQuery = path.split('?')[0] ?? ''
  const parts = withoutQuery.split('/')
  return (parts[parts.length - 1] ?? '').trim().toLowerCase()
}

export const isDefaultQuestionImagePath = (imagePath: string | null | undefined): boolean => {
  if (!imagePath || !imagePath.trim()) {
    return true
  }

  const fileName = getFileName(imagePath)
  if (!fileName) {
    return true
  }

  return DEFAULT_QUESTION_IMAGE_FILE_PATTERNS.some((pattern) => fileName.includes(pattern))
}

export const shouldShowQuestionImage = (params: {
  imagePath: string | null | undefined
  hideDefaultQuestionImage?: boolean
}): boolean => {
  const { imagePath, hideDefaultQuestionImage = false } = params

  if (!imagePath || !imagePath.trim()) {
    return false
  }

  if (hideDefaultQuestionImage && isDefaultQuestionImagePath(imagePath)) {
    return false
  }

  return true
}
