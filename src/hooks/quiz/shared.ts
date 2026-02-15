import type { Session } from '@supabase/supabase-js'

import type { AppConfig, Category, RankingEntry, Screen } from '@/types/quiz'

export const defaultConfig: AppConfig = {
  title: 'BEATRIZ PERAZZO',
  subtitle: 'QUIZ TIME',
  themeId: 'neon-purple',
}

export const levelKey = (categoryId: string, levelId: string): string => `${categoryId}:${levelId}`

export const removeCategoryKeys = <T extends Record<string, unknown>>(
  source: T,
  categoryId: string,
): T => {
  const next = { ...source }
  for (const key of Object.keys(next)) {
    if (key.startsWith(`${categoryId}:`)) {
      delete next[key]
    }
  }
  return next
}

export const getUniqueCategoryId = (categories: Category[], requestedId: string): string => {
  const base = requestedId || `categoria-${crypto.randomUUID().slice(0, 8)}`
  if (!categories.some((item) => item.id === base)) {
    return base
  }

  let counter = 2
  let candidate = `${base}-${counter}`
  while (categories.some((item) => item.id === candidate)) {
    counter += 1
    candidate = `${base}-${counter}`
  }

  return candidate
}

export const mergeRankings = (
  localEntries: RankingEntry[],
  remoteEntries: RankingEntry[],
): RankingEntry[] => {
  const map = new Map<string, RankingEntry>()

  for (const entry of [...remoteEntries, ...localEntries]) {
    if (!map.has(entry.submissionId)) {
      map.set(entry.submissionId, entry)
    }
  }

  return [...map.values()].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  )
}

export const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

export const getUserProfile = (
  session: Session | null,
): { name: string; avatarUrl: string | null } => {
  if (!session) {
    return { name: '', avatarUrl: null }
  }

  const metadata = session.user.user_metadata as Record<string, unknown> | undefined

  const displayNameCandidates = [
    metadata?.name,
    metadata?.full_name,
    metadata?.user_name,
    session.user.email,
  ]
  const avatarCandidates = [metadata?.avatar_url, metadata?.picture]

  const name = displayNameCandidates.find((value): value is string => typeof value === 'string')
  const avatarUrl = avatarCandidates.find((value): value is string => typeof value === 'string')

  return {
    name: name?.trim() ?? '',
    avatarUrl: avatarUrl?.trim() ?? null,
  }
}

const normalizePathname = (pathname: string): string => {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export const getScreenFromPath = (
  pathname: string,
): { screen: Screen; categoryId?: string; levelId?: string } => {
  const normalized = normalizePathname(pathname)

  if (normalized === '/') {
    return { screen: 'home' }
  }

  if (normalized === '/builder') {
    return { screen: 'builder' }
  }

  if (normalized === '/categories') {
    return { screen: 'categories' }
  }

  if (normalized === '/final') {
    return { screen: 'final' }
  }

  if (normalized === '/ranking') {
    return { screen: 'ranking' }
  }

  if (normalized === '/respond/result') {
    return { screen: 'respondResult' }
  }

  const quizMatch = /^\/categories\/([^/]+)\/levels\/([^/]+)\/quiz$/.exec(normalized)
  if (quizMatch) {
    return {
      screen: 'quiz',
      categoryId: decodePathSegment(quizMatch[1]),
      levelId: decodePathSegment(quizMatch[2]),
    }
  }

  const resultMatch = /^\/categories\/([^/]+)\/levels\/([^/]+)\/result$/.exec(normalized)
  if (resultMatch) {
    return {
      screen: 'levelResult',
      categoryId: decodePathSegment(resultMatch[1]),
      levelId: decodePathSegment(resultMatch[2]),
    }
  }

  const levelsMatch = /^\/categories\/([^/]+)\/levels$/.exec(normalized)
  if (levelsMatch) {
    return {
      screen: 'levels',
      categoryId: decodePathSegment(levelsMatch[1]),
    }
  }

  return { screen: 'home' }
}
