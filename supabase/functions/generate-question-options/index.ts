import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateQuestionChoicesPayload {
  categoryTitle?: string
  levelTitle?: string
  questionTitle?: string
  questionPrompt?: string
  imagePath?: string
  imageHint?: string
  correctAnswer?: string
  acceptedAnswers?: string[]
}

type AiProvider = 'gemini' | 'openai' | 'auto'

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
    const tmp = next[index]
    next[index] = next[randomIndex]
    next[randomIndex] = tmp
  }
  return next
}

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

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

const shortText = (value: string, max = 180): string => {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max)}...`
}

const maskEmail = (email: string): string => {
  if (!email.includes('@')) {
    return email
  }
  const [name, domain] = email.split('@')
  if (name.length <= 2) {
    return `**@${domain}`
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`
}

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
      const maybeJson = cleaned.slice(start, end + 1)
      try {
        const parsed = JSON.parse(maybeJson)
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch {
        return null
      }
    }
    return null
  }
}

const parseOptionsFromUnknownPayload = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const asRecord = payload as Record<string, unknown>
  const rawOptions = Array.isArray(asRecord.options)
    ? asRecord.options
    : Array.isArray(asRecord.alternatives)
      ? asRecord.alternatives
      : []
  const options = rawOptions.filter((item): item is string => typeof item === 'string')

  return options
}

const parseOptionsFromFreeText = (text: string): string[] => {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (!cleaned) {
    return []
  }

  const lines = cleaned
    .split(/\r?\n/g)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s+/, '')
        .replace(/^\d+\s*[\)\.\-:]\s+/, '')
        .replace(/^["']|["']$/g, ''),
    )
    .filter(Boolean)
    .filter((line) => !line.startsWith('{') && !line.startsWith('}'))

  const uniqueLines = uniqueByNormalized(lines)
  if (uniqueLines.length >= 4) {
    return uniqueLines.slice(0, 4)
  }

  const chunkSplit = cleaned
    .split(/\s*\|\s*|\s*;\s*/g)
    .map((item) => item.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  const uniqueChunks = uniqueByNormalized(chunkSplit)
  if (uniqueChunks.length >= 4) {
    return uniqueChunks.slice(0, 4)
  }

  return uniqueLines
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

const generateWithGemini = async (params: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
}): Promise<{ options: string[] } | { error: string; status: number; details?: string }> => {
  const { apiKey, model, systemPrompt, userPrompt } = params
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch (error) {
    return {
      error: 'Failed to reach Gemini',
      status: 502,
      details: safeErrorMessage(error),
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    return {
      error: 'Failed to generate options via Gemini',
      status: 502,
      details: `${response.status}: ${errorText.slice(0, 1000)}`,
    }
  }

  const responseJson = (await response.json()) as unknown
  const text = parseGeminiTextResponse(responseJson)
  const parsed = parseJsonFromModel(text)
  const options = parseOptionsFromUnknownPayload(parsed)
  const looseOptions = options.length > 0 ? options : parseOptionsFromFreeText(text)

  if (looseOptions.length >= 4) {
    return { options: looseOptions.slice(0, 4) }
  }

  return {
    error: 'Gemini did not return 4 options',
    status: 422,
    details: text.slice(0, 1000),
  }
}

const generateWithOpenAI = async (params: {
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
}): Promise<{ options: string[] } | { error: string; status: number; details?: string }> => {
  const { apiKey, model, systemPrompt, userPrompt } = params

  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: params.temperature ?? 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  } catch (error) {
    return {
      error: 'Failed to reach OpenAI',
      status: 502,
      details: safeErrorMessage(error),
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    return {
      error: 'Failed to generate options via OpenAI',
      status: 502,
      details: `${response.status}: ${errorText.slice(0, 1000)}`,
    }
  }

  const openAiJson = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = openAiJson.choices?.[0]?.message?.content ?? ''
  const parsed = parseJsonFromModel(content)
  const options = parseOptionsFromUnknownPayload(parsed)
  const looseOptions = options.length > 0 ? options : parseOptionsFromFreeText(content)
  if (looseOptions.length >= 4) {
    return { options: looseOptions.slice(0, 4) }
  }

  return {
    error: 'OpenAI did not return 4 options',
    status: 422,
    details: content.slice(0, 1000),
  }
}

const summarizeImagePath = (imagePath: string): string => {
  const trimmed = imagePath.trim()
  if (!trimmed) {
    return ''
  }

  const withoutQuery = trimmed.split('?')[0]
  const rawFileName = withoutQuery.split('/').pop() ?? ''
  const fileName = rawFileName.replace(/\.[a-z0-9]+$/i, '')
  const normalizedFileName = fileName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalizedFileName) {
    return ''
  }

  return `Arquivo da imagem: "${normalizedFileName}". Use isso apenas como pista, sem inventar fatos.`
}

const extractKeywords = (value: string): string[] => {
  const stopWords = new Set([
    'qual',
    'quais',
    'quem',
    'onde',
    'como',
    'quando',
    'porque',
    'por',
    'que',
    'de',
    'da',
    'do',
    'das',
    'dos',
    'na',
    'no',
    'nas',
    'nos',
    'com',
    'para',
    'uma',
    'um',
    'as',
    'os',
    'a',
    'o',
    'e',
    'ou',
    'em',
  ])

  return uniqueByNormalized(
    value
      .split(/\s+/g)
      .map((item) => item.trim())
      .filter((item) => item.length >= 4)
      .filter((item) => !stopWords.has(normalize(item))),
  ).slice(0, 4)
}

const buildFallbackOptions = (params: {
  correctAnswer: string
  acceptedAnswers: string[]
  rawOptions?: string[]
  questionPrompt?: string
  questionTitle?: string
  imageHint?: string
}): string[] => {
  const { correctAnswer, acceptedAnswers, rawOptions = [], questionPrompt, questionTitle, imageHint } =
    params
  const normalizedCorrect = normalize(correctAnswer)
  const contextKeywords = extractKeywords(
    [questionTitle ?? '', imageHint ?? '', questionPrompt ?? ''].join(' ').trim(),
  )
  const baseWrong = [
    ...rawOptions,
    ...acceptedAnswers,
    ...contextKeywords.map((keyword) => `${keyword} alternativa`),
    ...contextKeywords.map((keyword) => `${keyword} classico`),
    ...contextKeywords.map((keyword) => `${keyword} especial`),
    `${correctAnswer} alternativa`,
    `${correctAnswer} classico`,
    `${correctAnswer} remix`,
    'Opcao alternativa 1',
    'Opcao alternativa 2',
    'Opcao alternativa 3',
  ]

  const uniqueWrong = uniqueByNormalized(baseWrong)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => normalize(item) !== normalizedCorrect)

  const wrongOptions = uniqueWrong.slice(0, 3)
  while (wrongOptions.length < 3) {
    wrongOptions.push(`Opcao relacionada ${wrongOptions.length + 1}`)
  }

  return shuffle([correctAnswer, ...wrongOptions.slice(0, 3)])
}

Deno.serve(async (request) => {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()

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
    return jsonResponse({ error: 'Supabase env not configured for auth check' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    console.error('[generate-question-options] auth failed', {
      requestId,
      authError: authError?.message ?? null,
    })
    return jsonResponse({ error: 'Invalid or expired token' }, 401)
  }

  const adminEmails = (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  const requesterEmail = authData.user.email?.trim().toLowerCase() ?? ''
  if (adminEmails.length > 0 && !adminEmails.includes(requesterEmail)) {
    console.error('[generate-question-options] forbidden', {
      requestId,
      requesterEmail: maskEmail(requesterEmail),
    })
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const openAiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  const requestedProvider = (Deno.env.get('AI_PROVIDER') ?? 'auto').trim().toLowerCase()
  const provider: AiProvider =
    requestedProvider === 'gemini' || requestedProvider === 'openai' || requestedProvider === 'auto'
      ? requestedProvider
      : 'auto'

  let payload: GenerateQuestionChoicesPayload
  try {
    payload = (await request.json()) as GenerateQuestionChoicesPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const questionPrompt = payload.questionPrompt?.trim() ?? ''
  const questionTitle = payload.questionTitle?.trim() ?? ''
  const imagePath = payload.imagePath?.trim() ?? ''
  const imageHint = payload.imageHint?.trim() ?? ''
  const imagePathSummary = summarizeImagePath(imagePath)
  const correctAnswer =
    payload.correctAnswer?.trim() ??
    payload.acceptedAnswers?.map((item) => item.trim()).find((item) => item.length > 0) ??
    ''

  if (!questionPrompt || !correctAnswer) {
    console.error('[generate-question-options] invalid payload', {
      requestId,
      hasQuestionPrompt: Boolean(questionPrompt),
      hasCorrectAnswer: Boolean(correctAnswer),
    })
    return jsonResponse({ error: 'questionPrompt and correctAnswer are required' }, 400)
  }

  const systemPrompt = [
    'Voce gera alternativas para um quiz de multipla escolha em portugues.',
    'Retorne APENAS JSON valido no formato: {"options":["...","...","...","..."]}.',
    'Regras obrigatorias:',
    '- Exatamente 4 opcoes.',
    '- A resposta correta deve aparecer exatamente 1 vez.',
    '- As outras 3 devem ser plausiveis e coerentes com a pergunta.',
    '- Use o contexto de categoria, nivel, titulo/pergunta e dicas da imagem para manter coerencia.',
    '- Se houver imageHint ou imagePathSummary, use como contexto auxiliar, sem afirmar detalhes incertos.',
    '- Nao usar "todas as anteriores", "nenhuma das anteriores" ou opcoes repetidas.',
    '- Opcoes curtas, claras e distintas.',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      categoryTitle: payload.categoryTitle ?? '',
      levelTitle: payload.levelTitle ?? '',
      questionTitle,
      questionPrompt,
      imageHint,
      imagePath,
      imagePathSummary,
      correctAnswer,
      acceptedAnswers: payload.acceptedAnswers ?? [],
    },
    null,
    2,
  )
  const providerOrder: AiProvider[] =
    provider === 'auto' ? ['gemini', 'openai'] : [provider]
  console.log('[generate-question-options] request received', {
    requestId,
    requesterEmail: maskEmail(requesterEmail),
    provider,
    providerOrder,
    geminiModel,
    openAiModel,
    hasGeminiKey: Boolean(geminiKey),
    hasOpenAiKey: Boolean(openAiKey),
    payloadMeta: {
      categoryTitle: payload.categoryTitle ?? '',
      levelTitle: payload.levelTitle ?? '',
      questionTitle,
      questionPrompt: shortText(questionPrompt, 120),
      hasImageHint: Boolean(imageHint),
      hasImagePath: Boolean(imagePath),
    },
  })

  const providerErrors: Array<Record<string, unknown>> = []
  let rawOptions: string[] = []

  for (const activeProvider of providerOrder) {
    console.log('[generate-question-options] trying provider', {
      requestId,
      provider: activeProvider,
      model: activeProvider === 'gemini' ? geminiModel : openAiModel,
    })

    if (activeProvider === 'gemini') {
      if (!geminiKey) {
        providerErrors.push({
          provider: 'gemini',
          error: 'GEMINI_API_KEY not configured',
        })
        continue
      }

      const result = await generateWithGemini({
        apiKey: geminiKey,
        model: geminiModel,
        systemPrompt,
        userPrompt,
      })
      let resolvedResult = result
      if (!('options' in result)) {
        resolvedResult = await generateWithGemini({
          apiKey: geminiKey,
          model: geminiModel,
          systemPrompt,
          userPrompt,
          temperature: 0.35,
        })
      }

      if ('options' in resolvedResult) {
        console.log('[generate-question-options] provider success', {
          requestId,
          provider: 'gemini',
          optionsCount: resolvedResult.options.length,
        })
        rawOptions = resolvedResult.options
        break
      }

      console.error('[generate-question-options] provider failed', {
        requestId,
        provider: 'gemini',
        error: resolvedResult.error,
        details: shortText(resolvedResult.details ?? '', 300),
      })
      providerErrors.push({
        provider: 'gemini',
        error: resolvedResult.error,
        details: resolvedResult.details,
      })
      continue
    }

    if (!openAiKey) {
      providerErrors.push({
        provider: 'openai',
        error: 'OPENAI_API_KEY not configured',
      })
      continue
    }

    const result = await generateWithOpenAI({
      apiKey: openAiKey,
      model: openAiModel,
      systemPrompt,
      userPrompt,
    })
    let resolvedResult = result
    if (!('options' in result)) {
      resolvedResult = await generateWithOpenAI({
        apiKey: openAiKey,
        model: openAiModel,
        systemPrompt,
        userPrompt,
        temperature: 0.35,
      })
    }

    if ('options' in resolvedResult) {
      console.log('[generate-question-options] provider success', {
        requestId,
        provider: 'openai',
        optionsCount: resolvedResult.options.length,
      })
      rawOptions = resolvedResult.options
      break
    }

    console.error('[generate-question-options] provider failed', {
      requestId,
      provider: 'openai',
      error: resolvedResult.error,
      details: shortText(resolvedResult.details ?? '', 300),
    })
    providerErrors.push({
      provider: 'openai',
      error: resolvedResult.error,
      details: resolvedResult.details,
    })
  }

  if (rawOptions.length === 0) {
    console.error('[generate-question-options] all providers failed, using fallback', {
      requestId,
      providerErrors,
    })
    const fallbackOptions = buildFallbackOptions({
      correctAnswer,
      acceptedAnswers: payload.acceptedAnswers ?? [],
      questionPrompt,
      questionTitle,
      imageHint,
    })
    return jsonResponse({
      options: fallbackOptions,
      source: 'fallback',
      providerErrors,
    })
  }

  const normalizedCorrect = normalize(correctAnswer)
  const uniqueOptions = uniqueByNormalized(rawOptions)
  const wrongOptions = uniqueOptions
    .filter((option) => normalize(option) !== normalizedCorrect)
    .slice(0, 3)

  if (wrongOptions.length < 3) {
    console.warn('[generate-question-options] low quality provider response, repairing options', {
      requestId,
      uniqueOptionsCount: uniqueOptions.length,
    })
    const repairedOptions = buildFallbackOptions({
      correctAnswer,
      acceptedAnswers: payload.acceptedAnswers ?? [],
      rawOptions: uniqueOptions,
      questionPrompt,
      questionTitle,
      imageHint,
    })
    return jsonResponse({
      options: repairedOptions,
      source: 'provider-repaired',
      warning: 'Model response repaired with contextual fallback',
    })
  }

  const options = shuffle([correctAnswer, ...wrongOptions]).slice(0, 4)
  console.log('[generate-question-options] done', {
    requestId,
    source: 'provider',
  })
  return jsonResponse({ options })
})
