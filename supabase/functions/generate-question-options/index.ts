const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateQuestionChoicesPayload {
  categoryTitle?: string
  levelTitle?: string
  questionPrompt?: string
  correctAnswer?: string
  acceptedAnswers?: string[]
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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const openAiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'
  if (!openAiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY not configured' }, 500)
  }

  let payload: GenerateQuestionChoicesPayload
  try {
    payload = (await request.json()) as GenerateQuestionChoicesPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const questionPrompt = payload.questionPrompt?.trim() ?? ''
  const correctAnswer =
    payload.correctAnswer?.trim() ??
    payload.acceptedAnswers?.map((item) => item.trim()).find((item) => item.length > 0) ??
    ''

  if (!questionPrompt || !correctAnswer) {
    return jsonResponse({ error: 'questionPrompt and correctAnswer are required' }, 400)
  }

  const systemPrompt = [
    'Voce gera alternativas para um quiz de multipla escolha em portugues.',
    'Retorne APENAS JSON valido no formato: {"options":["...","...","...","..."]}.',
    'Regras obrigatorias:',
    '- Exatamente 4 opcoes.',
    '- A resposta correta deve aparecer exatamente 1 vez.',
    '- As outras 3 devem ser plausiveis e coerentes com a pergunta.',
    '- Nao usar "todas as anteriores", "nenhuma das anteriores" ou opcoes repetidas.',
    '- Opcoes curtas, claras e distintas.',
  ].join('\n')

  const userPrompt = JSON.stringify(
    {
      categoryTitle: payload.categoryTitle ?? '',
      levelTitle: payload.levelTitle ?? '',
      questionPrompt,
      correctAnswer,
      acceptedAnswers: payload.acceptedAnswers ?? [],
    },
    null,
    2,
  )

  const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModel,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text()
    console.error('OpenAI error', errorText)
    return jsonResponse({ error: 'Failed to generate options' }, 502)
  }

  const openAiJson = (await openAiResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = openAiJson.choices?.[0]?.message?.content ?? ''
  const parsed = parseJsonFromModel(content)
  const rawOptions = Array.isArray(parsed?.options)
    ? parsed.options.filter((item): item is string => typeof item === 'string')
    : []

  const normalizedCorrect = normalize(correctAnswer)
  const uniqueOptions = uniqueByNormalized(rawOptions)
  const wrongOptions = uniqueOptions
    .filter((option) => normalize(option) !== normalizedCorrect)
    .slice(0, 3)

  if (wrongOptions.length < 3) {
    return jsonResponse({ error: 'Model did not return enough coherent options' }, 422)
  }

  const options = shuffle([correctAnswer, ...wrongOptions]).slice(0, 4)
  return jsonResponse({ options })
})
