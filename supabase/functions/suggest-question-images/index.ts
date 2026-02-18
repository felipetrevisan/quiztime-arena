import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface QuestionImageSuggestion {
  id: string
  imageUrl: string
  thumbUrl: string
  source: string
  pageUrl?: string
  author?: string
}

interface QuerySuggestion {
  query: string
  alternatives: string[]
}

type AiProvider = 'gemini' | 'openai' | 'auto'

const jsonResponse = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const safeErrorMessage = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Unknown error'
}

const shortText = (value: string, max = 180): string =>
  value.length <= max ? value : `${value.slice(0, max)}...`

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

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>()
  const next: string[] = []

  for (const item of values) {
    const trimmed = item.trim()
    const key = normalize(trimmed)
    if (!trimmed || !key || seen.has(key)) {
      continue
    }
    seen.add(key)
    next.push(trimmed)
  }

  return next
}

const uniqueByImageUrl = (values: QuestionImageSuggestion[]): QuestionImageSuggestion[] => {
  const seen = new Set<string>()
  const next: QuestionImageSuggestion[] = []

  for (const item of values) {
    const key = item.imageUrl.trim().toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    next.push(item)
  }

  return next
}

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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
  if (!authHeader) return null

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

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
  const content =
    firstCandidate && typeof firstCandidate.content === 'object'
      ? (firstCandidate.content as Record<string, unknown>)
      : null
  const parts = content && Array.isArray(content.parts) ? content.parts : []
  const firstPart =
    parts.length > 0 && typeof parts[0] === 'object' ? (parts[0] as Record<string, unknown>) : null
  return (firstPart?.text as string | undefined)?.trim() ?? ''
}

const parseQuerySuggestion = (payload: unknown): QuerySuggestion | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const asRecord = payload as Record<string, unknown>
  const query = typeof asRecord.query === 'string' ? asRecord.query.trim() : ''
  const alternatives = Array.isArray(asRecord.alternatives)
    ? asRecord.alternatives.filter((item): item is string => typeof item === 'string')
    : []

  if (!query) {
    return null
  }

  return {
    query,
    alternatives: uniqueStrings(alternatives).slice(0, 3),
  }
}

const buildHeuristicQueries = (payload: SuggestQuestionImagesPayload): QuerySuggestion => {
  const questionPrompt = payload.questionPrompt?.trim() ?? ''
  const questionTitle = payload.questionTitle?.trim() ?? ''
  const categoryTitle = payload.categoryTitle?.trim() ?? ''
  const levelTitle = payload.levelTitle?.trim() ?? ''
  const imageHint = payload.imageHint?.trim() ?? ''
  const imagePath = payload.imagePath?.trim() ?? ''
  const fileName = imagePath.split('?')[0].split('/').pop()?.replace(/\.[a-z0-9]+$/i, '') ?? ''

  const candidates = uniqueStrings([
    imageHint,
    questionPrompt,
    questionTitle,
    `${questionPrompt} ${imageHint}`.trim(),
    `${questionTitle} ${imageHint}`.trim(),
    `${levelTitle} ${questionPrompt}`.trim(),
    `${categoryTitle} ${questionPrompt}`.trim(),
    `${categoryTitle} ${levelTitle} ${questionPrompt}`.trim(),
    fileName,
  ])

  const query = candidates[0] ?? ''
  return {
    query,
    alternatives: candidates.slice(1, 4),
  }
}

const suggestQueryWithGemini = async (params: {
  apiKey: string
  model: string
  payload: SuggestQuestionImagesPayload
}): Promise<QuerySuggestion | null> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`
  const systemPrompt = [
    'Voce gera consultas de busca de imagem para quiz.',
    'Retorne apenas JSON valido no formato {"query":"...","alternatives":["...","...","..."]}.',
    'Regras:',
    '- query curta (3 a 8 palavras), especifica e coerente ao contexto.',
    '- alternatives com variacoes uteis da mesma intencao.',
    '- Nao inclua aspas, markdown ou texto fora do JSON.',
  ].join('\n')

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': params.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(params.payload, null, 2) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  const raw = parseGeminiTextResponse((await response.json()) as unknown)
  return parseQuerySuggestion(parseJsonFromModel(raw))
}

const suggestQueryWithOpenAI = async (params: {
  apiKey: string
  model: string
  payload: SuggestQuestionImagesPayload
}): Promise<QuerySuggestion | null> => {
  let response: Response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Gere consulta de imagem para quiz. Retorne apenas JSON {"query":"...","alternatives":["..."]}.',
          },
          {
            role: 'user',
            content: JSON.stringify(params.payload, null, 2),
          },
        ],
      }),
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = json.choices?.[0]?.message?.content ?? ''
  return parseQuerySuggestion(parseJsonFromModel(text))
}

const fetchPexelsImages = async (params: {
  apiKey: string
  query: string
  limit: number
}): Promise<QuestionImageSuggestion[]> => {
  const endpoint =
    'https://api.pexels.com/v1/search?' +
    new URLSearchParams({
      per_page: String(Math.min(Math.max(params.limit, 1), 30)),
      page: '1',
      query: params.query,
    }).toString()

  const response = await fetch(endpoint, {
    headers: {
      Authorization: params.apiKey,
    },
  })
  if (!response.ok) {
    throw new Error(`Pexels error ${response.status}: ${await response.text()}`)
  }

  const json = (await response.json()) as {
    photos?: Array<{
      id?: number
      url?: string
      photographer?: string
      src?: {
        tiny?: string
        small?: string
        medium?: string
        large?: string
        original?: string
      }
    }>
  }

  const photos = Array.isArray(json.photos) ? json.photos : []
  return photos
    .map((photo) => {
      const imageUrl =
        photo.src?.large?.trim() ||
        photo.src?.medium?.trim() ||
        photo.src?.original?.trim() ||
        ''
      if (!imageUrl) return null

      const thumbUrl = photo.src?.small?.trim() || photo.src?.tiny?.trim() || imageUrl
      return {
        id: `pexels:${photo.id ?? normalize(imageUrl)}`,
        imageUrl,
        thumbUrl,
        source: 'pexels',
        pageUrl: photo.url?.trim(),
        author: photo.photographer?.trim(),
      } satisfies QuestionImageSuggestion
    })
    .filter((item): item is QuestionImageSuggestion => Boolean(item))
}

const fetchWikimediaImages = async (params: {
  query: string
  limit: number
}): Promise<QuestionImageSuggestion[]> => {
  const endpoint =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `${params.query} filetype:bitmap`,
      gsrlimit: String(Math.min(Math.max(params.limit, 1), 20)),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '640',
    }).toString()

  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Wikimedia error ${response.status}: ${await response.text()}`)
  }

  const json = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          pageid?: number
          title?: string
          imageinfo?: Array<{
            url?: string
            thumburl?: string
            descriptionurl?: string
            extmetadata?: {
              Artist?: { value?: string }
              LicenseShortName?: { value?: string }
            }
          }>
        }
      >
    }
  }

  const pages = json.query?.pages ? Object.values(json.query.pages) : []
  return pages
    .map((page) => {
      const info = page.imageinfo?.[0]
      const imageUrl = info?.url?.trim() ?? ''
      if (!imageUrl) return null

      const artist = stripHtml(info?.extmetadata?.Artist?.value ?? '')
      const license = stripHtml(info?.extmetadata?.LicenseShortName?.value ?? '')
      const author = [artist, license].filter(Boolean).join(' | ')

      return {
        id: `wikimedia:${page.pageid ?? normalize(imageUrl)}`,
        imageUrl,
        thumbUrl: info?.thumburl?.trim() || imageUrl,
        source: 'wikimedia',
        pageUrl: info?.descriptionurl?.trim(),
        author: author || page.title?.trim(),
      } satisfies QuestionImageSuggestion
    })
    .filter((item): item is QuestionImageSuggestion => Boolean(item))
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
    console.error('[suggest-question-images] auth failed', {
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
    console.error('[suggest-question-images] forbidden', {
      requestId,
      requesterEmail: maskEmail(requesterEmail),
    })
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  let payload: SuggestQuestionImagesPayload
  try {
    payload = (await request.json()) as SuggestQuestionImagesPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const limit = Math.min(Math.max(payload.limit ?? 8, 1), 12)
  const heuristic = buildHeuristicQueries(payload)
  if (!heuristic.query) {
    return jsonResponse({ error: 'questionPrompt, questionTitle or imageHint is required' }, 400)
  }

  const requestedProvider = (Deno.env.get('AI_PROVIDER') ?? 'auto').trim().toLowerCase()
  const provider: AiProvider =
    requestedProvider === 'gemini' || requestedProvider === 'openai' || requestedProvider === 'auto'
      ? requestedProvider
      : 'auto'
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const openAiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  const pexelsApiKey = Deno.env.get('PEXELS_API_KEY')

  const providerOrder: AiProvider[] = provider === 'auto' ? ['gemini', 'openai'] : [provider]

  console.log('[suggest-question-images] request received', {
    requestId,
    requesterEmail: maskEmail(requesterEmail),
    provider,
    providerOrder,
    geminiModel,
    openAiModel,
    hasGeminiKey: Boolean(geminiKey),
    hasOpenAiKey: Boolean(openAiKey),
    hasPexelsKey: Boolean(pexelsApiKey),
    payloadMeta: {
      categoryTitle: payload.categoryTitle?.trim() ?? '',
      levelTitle: payload.levelTitle?.trim() ?? '',
      questionTitle: payload.questionTitle?.trim() ?? '',
      questionPrompt: shortText(payload.questionPrompt?.trim() ?? '', 120),
      hasImageHint: Boolean(payload.imageHint?.trim()),
      hasImagePath: Boolean(payload.imagePath?.trim()),
      limit,
    },
  })

  let aiSuggestion: QuerySuggestion | null = null
  for (const activeProvider of providerOrder) {
    try {
      if (activeProvider === 'gemini' && geminiKey) {
        aiSuggestion = await suggestQueryWithGemini({
          apiKey: geminiKey,
          model: geminiModel,
          payload,
        })
      } else if (activeProvider === 'openai' && openAiKey) {
        aiSuggestion = await suggestQueryWithOpenAI({
          apiKey: openAiKey,
          model: openAiModel,
          payload,
        })
      }
    } catch (error) {
      console.error('[suggest-question-images] query suggestion provider failed', {
        requestId,
        provider: activeProvider,
        error: safeErrorMessage(error),
      })
      aiSuggestion = null
    }

    if (aiSuggestion?.query) {
      break
    }
  }

  const queryBundle = aiSuggestion ?? heuristic
  const searchQueries = uniqueStrings([queryBundle.query, ...queryBundle.alternatives]).slice(0, 4)

  const sourcesTried: string[] = []
  const sourceErrors: Array<{ source: string; query: string; message: string }> = []
  let suggestions: QuestionImageSuggestion[] = []

  for (const query of searchQueries) {
    if (suggestions.length >= limit) break

    if (pexelsApiKey) {
      sourcesTried.push('pexels')
      try {
        const pexelsImages = await fetchPexelsImages({
          apiKey: pexelsApiKey,
          query,
          limit,
        })
        suggestions = uniqueByImageUrl([...suggestions, ...pexelsImages])
      } catch (error) {
        sourceErrors.push({
          source: 'pexels',
          query,
          message: safeErrorMessage(error),
        })
      }
    }

    if (suggestions.length >= limit) break

    sourcesTried.push('wikimedia')
    try {
      const wikimediaImages = await fetchWikimediaImages({
        query,
        limit,
      })
      suggestions = uniqueByImageUrl([...suggestions, ...wikimediaImages])
    } catch (error) {
      sourceErrors.push({
        source: 'wikimedia',
        query,
        message: safeErrorMessage(error),
      })
    }
  }

  if (sourceErrors.length > 0) {
    console.error('[suggest-question-images] source errors', {
      requestId,
      sourceErrors: sourceErrors.map((error) => ({
        ...error,
        message: shortText(error.message, 300),
      })),
    })
  }

  const limited = suggestions.slice(0, limit)
  console.log('[suggest-question-images] done', {
    requestId,
    suggestions: limited.length,
    query: queryBundle.query,
    alternatives: queryBundle.alternatives,
    usedAiQuery: Boolean(aiSuggestion),
  })

  return jsonResponse({
    images: limited,
    query: queryBundle.query,
    alternatives: queryBundle.alternatives,
    usedAiQuery: Boolean(aiSuggestion),
    sourcesTried: uniqueStrings(sourcesTried),
    sourceErrors,
  })
})
