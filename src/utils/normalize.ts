const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas'])

export const normalizeAnswer = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .filter((token) => !ARTICLES.has(token))
    .join(' ')
    .trim()
}

export const isAnswerCorrect = (input: string, acceptedAnswers: string[]): boolean => {
  const normalizedInput = normalizeAnswer(input)

  if (!normalizedInput) {
    return false
  }

  return acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalizedInput)
}
