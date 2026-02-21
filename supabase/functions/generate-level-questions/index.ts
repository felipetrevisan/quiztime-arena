import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AiProvider = 'gemini' | 'openai' | 'auto'
type Difficulty = 'facil' | 'medio' | 'dificil' | 'insano'
type LevelMode = 'quiz' | 'blank'
type AnswerMode = 'text' | 'choices'

interface GenerateLevelQuestionsPayload {
  categoryTitle?: string
  levelTitle?: string
  levelDescription?: string
  levelMode?: LevelMode
  answerMode?: AnswerMode
  questionCount?: number
  themeHint?: string
  difficulty?: Difficulty
}

interface GeneratedQuestion {
  prompt: string
  imageHint: string
  correctAnswer: string
  acceptedAnswers: string[]
  options?: string[]
}

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const getBearerToken = (request: Request): string | null => {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return null
  }

  return match[1]?.trim() || null
}

const safeErrorMessage = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return 'Unknown error'
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim()

const uniqueByNormalized = (values: string[]): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  for (const value of values) {
    const normalized = normalize(value)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    next.push(value.trim())
  }

  return next
}

const shuffle = <T>(values: T[]): T[] => {
  const next = [...values]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[randomIndex]
    next[randomIndex] = current
  }
  return next
}

const parseJsonFromModel = (value: string): Record<string, unknown> | null => {
  const cleaned = value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1))
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch {
        return null
      }
    }
    return null
  }
}

const parseGeminiTextResponse = (responseJson: unknown): string => {
  if (!responseJson || typeof responseJson !== 'object') {
    return ''
  }

  const root = responseJson as Record<string, unknown>
  const candidates = Array.isArray(root.candidates) ? root.candidates : []
  const firstCandidate =
    candidates.length > 0 && typeof candidates[0] === 'object'
      ? (candidates[0] as Record<string, unknown>)
      : null
  if (!firstCandidate) {
    return ''
  }

  const content =
    typeof firstCandidate.content === 'object'
      ? (firstCandidate.content as Record<string, unknown>)
      : null
  const parts = content && Array.isArray(content.parts) ? content.parts : []
  const texts = parts
    .map((part) =>
      part && typeof part === 'object' ? (part as Record<string, unknown>).text : undefined,
    )
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)

  return texts.join('\n').trim()
}

const coerceQuestions = (value: unknown, mode: AnswerMode, count: number): GeneratedQuestion[] => {
  const root = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  const rawQuestions = root && Array.isArray(root.questions) ? root.questions : []
  const questions: GeneratedQuestion[] = []

  for (const item of rawQuestions) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const asRecord = item as Record<string, unknown>
    const prompt = typeof asRecord.prompt === 'string' ? asRecord.prompt.trim() : ''
    const imageHint = typeof asRecord.imageHint === 'string' ? asRecord.imageHint.trim() : ''
    const correctAnswer =
      typeof asRecord.correctAnswer === 'string' ? asRecord.correctAnswer.trim() : ''
    const acceptedAnswers = Array.isArray(asRecord.acceptedAnswers)
      ? asRecord.acceptedAnswers
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : []

    if (!prompt || !correctAnswer) {
      continue
    }

    const normalizedCorrect = normalize(correctAnswer)
    const withCorrect = acceptedAnswers.some((entry) => normalize(entry) === normalizedCorrect)
      ? acceptedAnswers
      : [correctAnswer, ...acceptedAnswers]

    let options: string[] | undefined
    if (mode === 'choices') {
      const rawOptions = Array.isArray(asRecord.options)
        ? asRecord.options.filter((entry): entry is string => typeof entry === 'string')
        : []
      const cleanOptions = uniqueByNormalized(rawOptions).filter(Boolean)
      const wrongOptions = cleanOptions
        .filter((entry) => normalize(entry) !== normalizedCorrect)
        .slice(0, 3)
      while (wrongOptions.length < 3) {
        wrongOptions.push(`Alternativa incorreta ${wrongOptions.length + 1}`)
      }

      options = shuffle([correctAnswer, ...wrongOptions.slice(0, 3)]).slice(0, 4)
    }

    questions.push({
      prompt,
      imageHint,
      correctAnswer,
      acceptedAnswers: withCorrect,
      options,
    })

    if (questions.length >= count) {
      break
    }
  }

  return questions
}

const buildFallbackQuestions = (params: {
  categoryTitle: string
  levelTitle: string
  levelDescription: string
  themeHint: string
  difficulty: Difficulty
  answerMode: AnswerMode
  questionCount: number
}): GeneratedQuestion[] => {
  const {
    categoryTitle,
    levelTitle,
    levelDescription,
    themeHint,
    difficulty,
    answerMode,
    questionCount,
  } = params

  const context = [categoryTitle, levelTitle, levelDescription, themeHint]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  const questions: GeneratedQuestion[] = []

  for (let index = 0; index < questionCount; index += 1) {
    const subject = context || 'tema geral'
    const prompt = `No contexto de "${subject}", pergunta ${index + 1} (${difficulty}).`
    const correctAnswer = `Resposta ${index + 1}`
    const acceptedAnswers = [correctAnswer]
    const options =
      answerMode === 'choices'
        ? shuffle([correctAnswer, 'Distrator A', 'Distrator B', 'Distrator C']).slice(0, 4)
        : undefined

    questions.push({
      prompt,
      imageHint: `${subject} ilustracao ${index + 1}`.slice(0, 90),
      correctAnswer,
      acceptedAnswers,
      options,
    })
  }

  return questions
}

const generateWithGemini = async (params: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}): Promise<{ questions: GeneratedQuestion[] } | { error: string; details?: string }> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': params.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    },
  ).catch(
    (error: unknown) =>
      ({
        ok: false,
        status: 0,
        text: async () => safeErrorMessage(error),
        json: async () => ({}),
      }) as Response,
  )

  if (!response.ok) {
    return {
      error: 'Failed to generate via Gemini',
      details: await response.text(),
    }
  }

  const json = (await response.json()) as unknown
  const text = parseGeminiTextResponse(json)
  const parsed = parseJsonFromModel(text)
  const mode = params.userPrompt.includes('"answerMode": "choices"') ? 'choices' : 'text'
  const questions = coerceQuestions(parsed, mode, 24)

  if (questions.length === 0) {
    return {
      error: 'Gemini returned empty payload',
      details: text.slice(0, 400),
    }
  }

  return { questions }
}

const generateWithOpenAI = async (params: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
}): Promise<{ questions: GeneratedQuestion[] } | { error: string; details?: string }> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  }).catch(
    (error: unknown) =>
      ({
        ok: false,
        status: 0,
        text: async () => safeErrorMessage(error),
        json: async () => ({}),
      }) as Response,
  )

  if (!response.ok) {
    return {
      error: 'Failed to generate via OpenAI',
      details: await response.text(),
    }
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content ?? ''
  const parsed = parseJsonFromModel(content)
  const mode = params.userPrompt.includes('"answerMode": "choices"') ? 'choices' : 'text'
  const questions = coerceQuestions(parsed, mode, 24)

  if (questions.length === 0) {
    return {
      error: 'OpenAI returned empty payload',
      details: content.slice(0, 400),
    }
  }

  return { questions }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const token = getBearerToken(request)
  if (!token) {
    return jsonResponse({ error: 'Missing bearer token' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Supabase env not configured' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401)
  }

  const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  const requesterEmail = authData.user.email?.trim().toLowerCase() ?? ''
  if (adminEmails.length > 0 && !adminEmails.includes(requesterEmail)) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  let payload: GenerateLevelQuestionsPayload
  try {
    payload = (await request.json()) as GenerateLevelQuestionsPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const categoryTitle = payload.categoryTitle?.trim() ?? ''
  const levelTitle = payload.levelTitle?.trim() ?? ''
  const levelDescription = payload.levelDescription?.trim() ?? ''
  const levelMode: LevelMode = payload.levelMode === 'blank' ? 'blank' : 'quiz'
  const answerMode: AnswerMode = payload.answerMode === 'choices' ? 'choices' : 'text'
  const questionCount = Math.max(1, Math.min(24, Number(payload.questionCount) || 8))
  const themeHint = payload.themeHint?.trim() ?? ''
  const difficulty: Difficulty =
    payload.difficulty === 'facil' ||
    payload.difficulty === 'medio' ||
    payload.difficulty === 'dificil' ||
    payload.difficulty === 'insano'
      ? payload.difficulty
      : 'medio'

  if (!categoryTitle || !levelTitle) {
    return jsonResponse({ error: 'categoryTitle and levelTitle are required' }, 400)
  }

  const systemPrompt = [
    'Voce cria perguntas de quiz em portugues (pt-BR).',
    'Retorne APENAS JSON valido no formato: {"questions":[{"prompt":"","imageHint":"","correctAnswer":"","acceptedAnswers":[""],"options":["","","",""]}]}',
    'Regras obrigatorias:',
    '- Retorne exatamente a quantidade solicitada.',
    '- Nao repetir perguntas.',
    '- Perguntas claras e jogaveis.',
    '- imageHint deve ser curto (3 a 8 palavras) e util para buscar imagem.',
    '- correctAnswer deve ser objetivo.',
    '- acceptedAnswers inclui ao menos 1 variacao/sinonimo quando possivel.',
    '- Se answerMode = "choices": incluir exatamente 4 opcoes e a correta exatamente 1 vez.',
    '- Se answerMode = "text": options pode ser omitido.',
    '- Nao inclua explicacoes fora do JSON.',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      categoryTitle,
      levelTitle,
      levelDescription,
      levelMode,
      answerMode,
      questionCount,
      themeHint,
      difficulty,
    },
    null,
    2,
  )

  const requestedProvider = (Deno.env.get('AI_PROVIDER') ?? 'auto').trim().toLowerCase()
  const provider: AiProvider =
    requestedProvider === 'gemini' || requestedProvider === 'openai' || requestedProvider === 'auto'
      ? requestedProvider
      : 'auto'
  const providerOrder = provider === 'auto' ? (['gemini', 'openai'] as const) : [provider]

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const openAiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

  const errors: Array<Record<string, unknown>> = []
  let generatedQuestions: GeneratedQuestion[] = []

  for (const activeProvider of providerOrder) {
    if (activeProvider === 'gemini') {
      if (!geminiKey) {
        errors.push({ provider: 'gemini', error: 'GEMINI_API_KEY missing' })
        continue
      }

      const result = await generateWithGemini({
        apiKey: geminiKey,
        model: geminiModel,
        systemPrompt,
        userPrompt,
      })

      if ('questions' in result) {
        generatedQuestions = result.questions
        break
      }

      errors.push({ provider: 'gemini', error: result.error, details: result.details })
      continue
    }

    if (!openAiKey) {
      errors.push({ provider: 'openai', error: 'OPENAI_API_KEY missing' })
      continue
    }

    const result = await generateWithOpenAI({
      apiKey: openAiKey,
      model: openAiModel,
      systemPrompt,
      userPrompt,
    })

    if ('questions' in result) {
      generatedQuestions = result.questions
      break
    }

    errors.push({ provider: 'openai', error: result.error, details: result.details })
  }

  if (generatedQuestions.length === 0) {
    const fallback = buildFallbackQuestions({
      categoryTitle,
      levelTitle,
      levelDescription,
      themeHint,
      difficulty,
      answerMode,
      questionCount,
    })
    return jsonResponse({
      questions: fallback,
      source: 'fallback',
      providerErrors: errors,
    })
  }

  const repaired = coerceQuestions({ questions: generatedQuestions }, answerMode, questionCount)
  const questions =
    repaired.length >= questionCount
      ? repaired.slice(0, questionCount)
      : [
          ...repaired,
          ...buildFallbackQuestions({
            categoryTitle,
            levelTitle,
            levelDescription,
            themeHint,
            difficulty,
            answerMode,
            questionCount: questionCount - repaired.length,
          }),
        ].slice(0, questionCount)

  return jsonResponse({
    questions,
    source: 'provider',
  })
})
