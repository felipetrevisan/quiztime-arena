import type { Category, RankingEntry } from '@/types/quiz'
import { useLocalStorageState } from '@/utils/storage'
import { useEffect } from 'react'

interface PublishedQuizzesScreenProps {
  categories: Category[]
  rankings: RankingEntry[]
  currentUserId: string | null
  onBack: () => void
  onPlayLevel: (categoryId: string, levelId: string) => void
  onCreateDuel: (categoryId: string, levelId: string) => void | Promise<void>
  creatingDuelKey?: string | null
}

const normalizeIdentity = (value: string): string => value.trim().toLowerCase()
const PLAY_CATEGORIES_ACCORDION_KEY = 'quiztime.play.categories.accordion.v1'

export const PublishedQuizzesScreen = ({
  categories,
  rankings,
  currentUserId,
  onBack,
  onPlayLevel,
  onCreateDuel,
  creatingDuelKey = null,
}: PublishedQuizzesScreenProps) => {
  const [categoryAccordionState, setCategoryAccordionState] = useLocalStorageState<
    Record<string, boolean>
  >(PLAY_CATEGORIES_ACCORDION_KEY, {})

  const publishedCategories = categories
    .map((category) => ({
      ...category,
      levels: category.levels.filter((level) => level.isPublished),
    }))
    .filter((category) => category.levels.length > 0)

  useEffect(() => {
    const validCategoryIds = new Set(publishedCategories.map((category) => category.id))
    setCategoryAccordionState((previous) => {
      let changed = false
      const nextState: Record<string, boolean> = {}

      for (const [categoryId, open] of Object.entries(previous)) {
        if (!validCategoryIds.has(categoryId)) {
          changed = true
          continue
        }

        nextState[categoryId] = Boolean(open)
      }

      return changed ? nextState : previous
    })
  }, [publishedCategories, setCategoryAccordionState])

  const toggleCategoryAccordion = (categoryId: string) => {
    setCategoryAccordionState((previous) => ({
      ...previous,
      [categoryId]: !(previous[categoryId] ?? false),
    }))
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-white">
            Quizzes publicados
          </h2>
          <p className="text-xs text-white/75">Somente quizzes liberados pelo admin.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [overscroll-behavior:contain]">
        {publishedCategories.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-black/30 p-4 text-sm text-white/80">
            Nenhum quiz publicado no momento.
          </div>
        ) : (
          publishedCategories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-white/25 bg-black/30 p-3"
            >
              <button
                type="button"
                aria-expanded={categoryAccordionState[category.id] ?? false}
                aria-controls={`play-category-${category.id}`}
                onClick={() => toggleCategoryAccordion(category.id)}
                className="flex w-full items-start justify-between gap-2 text-left"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200/90">
                    Categoria
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-white">{category.title}</h3>
                  <p className="text-xs text-white/75">{category.description}</p>
                </div>
                <span className="rounded-lg border border-white/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                  {(categoryAccordionState[category.id] ?? false) ? 'Ocultar' : 'Mostrar'}
                </span>
              </button>

              {(categoryAccordionState[category.id] ?? false) && (
                <div id={`play-category-${category.id}`} className="mt-3 space-y-2">
                  {category.levels.map((level, index) => {
                    const alreadyPlayed = rankings.some((entry) => {
                      if (!currentUserId || entry.userId !== currentUserId) {
                        return false
                      }

                      if (entry.levelId && entry.categoryId) {
                        return entry.categoryId === category.id && entry.levelId === level.id
                      }

                      return (
                        normalizeIdentity(entry.categoryTitle) ===
                          normalizeIdentity(category.title) &&
                        normalizeIdentity(entry.levelTitle) === normalizeIdentity(level.title)
                      )
                    })

                    const isSpeedrun = level.timingMode === 'speedrun'
                    const canPlay = isSpeedrun || !alreadyPlayed
                    const duelKey = `${category.id}:${level.id}`
                    const creatingDuel = creatingDuelKey === duelKey

                    return (
                      <div
                        key={level.id}
                        className="rounded-xl border border-white/20 bg-black/35 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
                              Nivel {index + 1}
                            </p>
                            <p className="text-sm font-bold text-white">{level.title}</p>
                            <p className="text-[11px] text-white/70">{level.description}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100/80">
                              {isSpeedrun ? 'Modo speed run' : 'Modo normal'}
                            </p>
                            <p
                              className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                                alreadyPlayed ? 'text-emerald-200/90' : 'text-white/70'
                              }`}
                            >
                              {alreadyPlayed ? 'Voce ja jogou' : 'Ainda nao jogado'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              disabled={!canPlay}
                              onClick={() => onPlayLevel(category.id, level.id)}
                              className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] ${
                                canPlay
                                  ? 'border-cyan-200/40 bg-cyan-500/20 text-cyan-100'
                                  : 'cursor-not-allowed border-white/20 bg-black/20 text-white/50'
                              }`}
                            >
                              {alreadyPlayed
                                ? isSpeedrun
                                  ? 'Jogar novamente'
                                  : 'Rejogo bloqueado'
                                : 'Jogar'}
                            </button>
                            <button
                              type="button"
                              disabled={creatingDuel}
                              onClick={() => void onCreateDuel(category.id, level.id)}
                              className="rounded-lg border border-fuchsia-200/40 bg-fuchsia-500/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {creatingDuel ? 'Criando...' : 'Duelo'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  )
}
