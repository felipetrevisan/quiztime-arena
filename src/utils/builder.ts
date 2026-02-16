import type { AnswerMode, Level, LevelMode, Question, TimingMode } from '@/types/quiz'

const makeQuestion = (index: number, mode: LevelMode): Question => {
  if (mode === 'blank') {
    return {
      id: `custom-q-${crypto.randomUUID()}`,
      prompt: '',
      imagePath: '/assets/cartoons/template.svg',
      acceptedAnswers: [],
      correctAnswerDisplay: '',
      choiceOptions: [],
    }
  }

  return {
    id: `custom-q-${crypto.randomUUID()}`,
    prompt: `Pergunta ${index + 1}`,
    imagePath: '/assets/cartoons/template.svg',
    acceptedAnswers: ['resposta'],
    correctAnswerDisplay: 'Resposta',
    choiceOptions: [],
  }
}

export const createEmptyLevel = (
  title: string,
  description: string,
  mode: LevelMode = 'quiz',
  timingMode: TimingMode = 'timeless',
  answerMode: AnswerMode = 'text',
): Level => ({
  id: `level-${crypto.randomUUID()}`,
  title,
  description,
  mode,
  timingMode,
  answerMode,
  isPublished: false,
  questions: Array.from({ length: 8 }, (_, index) => makeQuestion(index, mode)),
})
