import type {
  Category,
  Level,
  Question,
  QuestionImageSuggestion,
  RankingEntry,
} from '@/types/quiz'
import { isSupabaseEnabled, supabase } from '@/utils/supabase'

interface CategoryRow {
  id: string
  title: string
  subtitle: string
  description: string
  cover_image: string
  position: number
  levels: LevelRow[] | null
}

interface LevelRow {
  id: string
  title: string
  description: string
  mode: 'quiz' | 'blank' | null
  timing_mode: 'timeless' | 'speedrun' | null
  answer_format: 'text' | 'choices' | null
  is_published: boolean | null
  position: number
  questions: QuestionRow[] | null
}

interface QuestionRow {
  id: string
  prompt: string
  image_path: string
  image_hint: string | null
  accepted_answers: string[] | null
  correct_answer_display: string
  choice_options: string[] | null
  correct_index: number | null
  position: number
}

interface GenerateQuestionChoicesPayload {
  categoryTitle: string
  levelTitle: string
  questionTitle?: string
  questionPrompt: string
  imagePath?: string
  imageHint?: string
  correctAnswer: string
  acceptedAnswers: string[]
}

interface SuggestQuestionImagesPayload {
  categoryTitle?: string
  levelTitle?: string
  questionTitle?: string
  questionPrompt?: string
  imageHint?: string
  imagePath?: string
  limit?: number
}

interface RankingRow {
  submission_id: string
  quiz_id: string
  category_id: string | null
  level_id: string | null
  user_id: string | null
  responder_name: string
  responder_avatar_data_url: string | null
  category_title: string
  level_title: string
  score: number
  total: number
  points: number | null
  duration_ms: number | null
  play_mode: 'timeless' | 'speedrun' | null
  answers: Record<string, string>
  results: Record<string, boolean>
  submitted_at: string
}

const toQuestion = (row: QuestionRow): Question => {
  const options = (row.choice_options ?? []).slice(0, 4)
  while (options.length < 4) {
    options.push(`Opcao ${options.length + 1}`)
  }

  const safeCorrectIndex =
    typeof row.correct_index === 'number' && row.correct_index >= 0 && row.correct_index < 4
      ? row.correct_index
      : 0

  if (!options[safeCorrectIndex]?.trim() && row.correct_answer_display.trim()) {
    options[safeCorrectIndex] = row.correct_answer_display.trim()
  }

  return {
    id: row.id,
    question: row.prompt,
    prompt: row.prompt,
    imagePath: row.image_path,
    imageHint: row.image_hint ?? '',
    options,
    correctIndex: safeCorrectIndex,
    acceptedAnswers: row.accepted_answers ?? [],
    correctAnswerDisplay: row.correct_answer_display,
  }
}

const toLevel = (row: LevelRow): Level => ({
  id: row.id,
  title: row.title,
  description: row.description,
  mode: row.mode ?? 'quiz',
  timingMode: row.timing_mode ?? 'timeless',
  answerMode: row.answer_format ?? 'text',
  isPublished: row.is_published ?? false,
  questions: (row.questions ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map(toQuestion),
})

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  title: row.title,
  subtitle: row.subtitle,
  description: row.description,
  coverImage: row.cover_image,
  levels: (row.levels ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .map(toLevel),
})

const toRankingEntry = (row: RankingRow): RankingEntry => ({
  version: 1,
  submissionId: row.submission_id,
  quizId: row.quiz_id,
  categoryId: row.category_id ?? undefined,
  levelId: row.level_id ?? undefined,
  userId: row.user_id,
  responderName: row.responder_name,
  responderAvatarDataUrl: row.responder_avatar_data_url,
  categoryTitle: row.category_title,
  levelTitle: row.level_title,
  score: row.score,
  total: row.total,
  points: row.points ?? row.score,
  durationMs: row.duration_ms ?? 0,
  playMode: row.play_mode ?? 'timeless',
  answers: row.answers,
  results: row.results,
  submittedAt: row.submitted_at,
})

export const fetchRemoteCategories = async (): Promise<Category[] | null> => {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('categories')
    .select(
      'id,title,subtitle,description,cover_image,position,levels(id,title,description,mode,timing_mode,answer_format,is_published,position,questions(id,prompt,image_path,image_hint,accepted_answers,correct_answer_display,choice_options,correct_index,position))',
    )
    .order('position', { ascending: true })

  if (error) {
    console.error('Erro ao carregar categorias no Supabase', error)
    return null
  }

  const rows = (data ?? []) as unknown as CategoryRow[]
  return rows.map(toCategory)
}

const upsertQuestion = async (
  levelId: string,
  question: Question,
  position: number,
): Promise<void> => {
  if (!supabase) return

  const { error } = await supabase.from('questions').upsert(
    {
      id: question.id,
      level_id: levelId,
      prompt: question.question || question.prompt,
      image_path: question.imagePath,
      image_hint: question.imageHint ?? '',
      accepted_answers: question.acceptedAnswers,
      correct_answer_display: question.correctAnswerDisplay,
      choice_options: question.options ?? [],
      correct_index: question.correctIndex ?? 0,
      position,
    },
    {
      onConflict: 'id',
    },
  )

  if (error) {
    console.error('Erro ao salvar pergunta no Supabase', error)
  }
}

const upsertLevel = async (categoryId: string, level: Level, position: number): Promise<void> => {
  if (!supabase) return

  const { error } = await supabase.from('levels').upsert(
    {
      id: level.id,
      category_id: categoryId,
      title: level.title,
      description: level.description,
      mode: level.mode ?? 'quiz',
      timing_mode: level.timingMode ?? 'timeless',
      answer_format: level.answerMode ?? 'text',
      is_published: level.isPublished ?? false,
      position,
    },
    {
      onConflict: 'id',
    },
  )

  if (error) {
    console.error('Erro ao salvar nivel no Supabase', error)
    return
  }

  for (const [questionPosition, question] of level.questions.entries()) {
    await upsertQuestion(level.id, question, questionPosition)
  }
}

export const upsertRemoteCategory = async (category: Category, position: number): Promise<void> => {
  if (!supabase) return

  const { error } = await supabase.from('categories').upsert(
    {
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
      description: category.description,
      cover_image: category.coverImage,
      position,
    },
    {
      onConflict: 'id',
    },
  )

  if (error) {
    console.error('Erro ao salvar categoria no Supabase', error)
    return
  }

  for (const [levelPosition, level] of category.levels.entries()) {
    await upsertLevel(category.id, level, levelPosition)
  }
}

export const upsertRemoteLevel = async (
  categoryId: string,
  level: Level,
  position: number,
): Promise<void> => {
  await upsertLevel(categoryId, level, position)
}

export const seedRemoteCategories = async (categories: Category[]): Promise<void> => {
  for (const [index, category] of categories.entries()) {
    await upsertRemoteCategory(category, index)
  }
}

export const updateRemoteQuestionImage = async (
  questionId: string,
  imageUrl: string,
): Promise<void> => {
  if (!supabase) return

  const { error } = await supabase
    .from('questions')
    .update({ image_path: imageUrl })
    .eq('id', questionId)

  if (error) {
    console.error('Erro ao atualizar imagem da pergunta', error)
  }
}

export const generateRemoteQuestionChoices = async (
  payload: GenerateQuestionChoicesPayload,
): Promise<string[] | null> => {
  if (!supabase) return null

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      console.error('Erro ao gerar opcoes com IA: sessao nao encontrada')
      return null
    }

    const { data, error, response } = await supabase.functions.invoke<{
      options?: unknown
      error?: string
      details?: string
      providerStatus?: number
      providerBody?: string
    }>('generate-question-options', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      let functionDetails = ''
      if (response) {
        try {
          const contentType = response.headers.get('Content-Type') ?? ''
          if (contentType.includes('application/json')) {
            const json = (await response.clone().json()) as Record<string, unknown>
            functionDetails = JSON.stringify(json)
          } else {
            functionDetails = await response.clone().text()
          }
        } catch {
          functionDetails = ''
        }
      }

      console.error('Erro ao gerar opcoes com IA', {
        error,
        functionDetails,
      })
      return null
    }

    const options = Array.isArray(data?.options)
      ? data.options.filter((item): item is string => typeof item === 'string')
      : []

    if (options.length !== 4) {
      return null
    }

    return options
  } catch (error) {
    console.error('Erro inesperado ao gerar opcoes com IA', error)
    return null
  }
}

export const suggestRemoteQuestionImages = async (
  payload: SuggestQuestionImagesPayload,
): Promise<QuestionImageSuggestion[] | null> => {
  if (!supabase) return null

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      console.error('Erro ao sugerir imagens com IA: sessao nao encontrada')
      return null
    }

    const { data, error, response } = await supabase.functions.invoke<{
      images?: unknown
      error?: string
      details?: string
    }>('suggest-question-images', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      let functionDetails = ''
      if (response) {
        try {
          const contentType = response.headers.get('Content-Type') ?? ''
          if (contentType.includes('application/json')) {
            const json = (await response.clone().json()) as Record<string, unknown>
            functionDetails = JSON.stringify(json)
          } else {
            functionDetails = await response.clone().text()
          }
        } catch {
          functionDetails = ''
        }
      }

      console.error('Erro ao sugerir imagens com IA', {
        error,
        functionDetails,
      })
      return null
    }

    const images = Array.isArray(data?.images)
      ? data.images
          .map((item): QuestionImageSuggestion | null => {
            if (!item || typeof item !== 'object') return null
            const asRecord = item as Record<string, unknown>
            const id = typeof asRecord.id === 'string' ? asRecord.id.trim() : ''
            const imageUrl = typeof asRecord.imageUrl === 'string' ? asRecord.imageUrl.trim() : ''
            const thumbUrl =
              typeof asRecord.thumbUrl === 'string' ? asRecord.thumbUrl.trim() : imageUrl
            const source = typeof asRecord.source === 'string' ? asRecord.source.trim() : 'web'
            const pageUrl =
              typeof asRecord.pageUrl === 'string' ? asRecord.pageUrl.trim() : undefined
            const author = typeof asRecord.author === 'string' ? asRecord.author.trim() : undefined

            if (!id || !imageUrl) {
              return null
            }

            return {
              id,
              imageUrl,
              thumbUrl: thumbUrl || imageUrl,
              source,
              pageUrl,
              author,
            }
          })
          .filter((item): item is QuestionImageSuggestion => Boolean(item))
      : []

    return images
  } catch (error) {
    console.error('Erro inesperado ao sugerir imagens com IA', error)
    return null
  }
}

export const fetchRemoteRankings = async (): Promise<RankingEntry[] | null> => {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('rankings')
    .select(
      'submission_id,quiz_id,category_id,level_id,user_id,responder_name,responder_avatar_data_url,category_title,level_title,score,total,points,duration_ms,play_mode,answers,results,submitted_at',
    )
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar ranking no Supabase', error)
    return null
  }

  const rows = (data ?? []) as unknown as RankingRow[]
  return rows.map(toRankingEntry)
}

export const saveRemoteRanking = async (entry: RankingEntry): Promise<boolean> => {
  if (!supabase) return false

  const { error } = await supabase.from('rankings').upsert(
    {
      submission_id: entry.submissionId,
      quiz_id: entry.quizId,
      category_id: entry.categoryId ?? null,
      level_id: entry.levelId ?? null,
      user_id: entry.userId ?? null,
      responder_name: entry.responderName,
      responder_avatar_data_url: entry.responderAvatarDataUrl,
      category_title: entry.categoryTitle,
      level_title: entry.levelTitle,
      score: entry.score,
      total: entry.total,
      points: entry.points ?? entry.score,
      duration_ms: entry.durationMs ?? 0,
      play_mode: entry.playMode ?? 'timeless',
      answers: entry.answers,
      results: entry.results,
      submitted_at: entry.submittedAt,
    },
    {
      onConflict: 'submission_id',
      ignoreDuplicates: true,
    },
  )

  if (error) {
    console.error('Erro ao salvar ranking no Supabase', error)
    return false
  }

  return true
}

export const uploadRemoteAsset = async (file: File, path: string): Promise<string | null> => {
  if (!supabase) return null

  const { error } = await supabase.storage.from('quiz-assets').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    console.error('Erro ao subir asset no Supabase Storage', error)
    return null
  }

  const { data } = supabase.storage.from('quiz-assets').getPublicUrl(path)
  return data.publicUrl
}

export const hasRemote = (): boolean => isSupabaseEnabled

export const deleteRemoteLevel = async (levelId: string): Promise<boolean> => {
  if (!supabase) {
    return false
  }

  const { error } = await supabase.from('levels').delete().eq('id', levelId)
  if (error) {
    console.error('Erro ao excluir nivel no Supabase', error)
    return false
  }

  return true
}
