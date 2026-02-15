import type { Level, LevelMode, Question } from '@/types/quiz'

const makeQuestion = (index: number, mode: LevelMode): Question => {
  if (mode === 'blank') {
    return {
      id: `custom-q-${crypto.randomUUID()}`,
      prompt: '',
      imagePath: '/assets/cartoons/template.svg',
      acceptedAnswers: [],
      correctAnswerDisplay: '',
    }
  }

  return {
    id: `custom-q-${crypto.randomUUID()}`,
    prompt: `Pergunta ${index + 1}`,
    imagePath: '/assets/cartoons/template.svg',
    acceptedAnswers: ['resposta'],
    correctAnswerDisplay: 'Resposta',
  }
}

export const createEmptyLevel = (
  title: string,
  description: string,
  mode: LevelMode = 'quiz',
): Level => ({
  id: `level-${crypto.randomUUID()}`,
  title,
  description,
  mode,
  questions: Array.from({ length: 8 }, (_, index) => makeQuestion(index, mode)),
})
