import type { AnswerMode, Level, LevelMode, Question, TimingMode } from '@/types/quiz'

const makeQuestion = (index: number, mode: LevelMode): Question => {
  if (mode === 'blank') {
    return {
      id: `custom-q-${crypto.randomUUID()}`,
      question: '',
      prompt: '',
      imagePath: '/assets/cartoons/template.svg',
      options: ['', '', '', ''],
      correctIndex: 0,
      acceptedAnswers: [],
      correctAnswerDisplay: '',
    }
  }

  return {
    id: `custom-q-${crypto.randomUUID()}`,
    question: `Pergunta ${index + 1}`,
    prompt: `Pergunta ${index + 1}`,
    imagePath: '/assets/cartoons/template.svg',
    options: ['Opcao A', 'Opcao B', 'Opcao C', 'Opcao D'],
    correctIndex: 0,
    acceptedAnswers: ['resposta'],
    correctAnswerDisplay: 'Resposta',
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
