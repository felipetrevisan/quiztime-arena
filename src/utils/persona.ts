const PERSONA_STORAGE_KEY = 'quiztime.persona-alias.v1'

export interface PersonaTheme {
  title: string
  subtitle: string
}

const personaMap: Record<string, PersonaTheme> = {
  bea: {
    title: 'BEATRIZ PERAZZO',
    subtitle: 'QUIZ TIME',
  },
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage
}

const getLegacyStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.sessionStorage
}

export const getPersonaTheme = (alias: string | null): PersonaTheme | null => {
  if (!alias) {
    return null
  }
  return personaMap[alias] ?? null
}

export const getActivePersonaAlias = (): string | null => {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const current = storage.getItem(PERSONA_STORAGE_KEY)?.trim().toLowerCase() ?? ''
  if (current && personaMap[current]) {
    return current
  }

  const legacyStorage = getLegacyStorage()
  const legacyAlias = legacyStorage?.getItem(PERSONA_STORAGE_KEY)?.trim().toLowerCase() ?? ''
  if (!legacyAlias || !personaMap[legacyAlias]) {
    return null
  }

  storage.setItem(PERSONA_STORAGE_KEY, legacyAlias)
  legacyStorage?.removeItem(PERSONA_STORAGE_KEY)
  const alias = legacyAlias
  if (!alias) {
    return null
  }

  return personaMap[alias] ? alias : null
}

export const setActivePersonaAlias = (alias: string): void => {
  const storage = getStorage()
  if (!storage) {
    return
  }

  const normalized = alias.trim().toLowerCase()
  if (!normalized || !personaMap[normalized]) {
    return
  }

  storage.setItem(PERSONA_STORAGE_KEY, normalized)
}
