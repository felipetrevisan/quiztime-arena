import type { Category, LevelRecord } from '@/types/quiz'
import { motion } from 'motion/react'

interface LevelsScreenProps {
  category: Category
  records: Record<string, LevelRecord>
  shareLinks: Record<string, string>
  rankingPreviewLinks: Record<string, string>
  shortLinks: Record<string, string>
  onBack: () => void
  onSelectLevel: (levelId: string) => void
  onShareLevel: (levelId: string) => void
  onCopyShareLink: (levelId: string) => void
  onShareRankingPreview: (levelId: string) => void
  onShortenShareLink: (levelId: string) => void
}

export const LevelsScreen = ({
  category,
  records,
  shareLinks,
  rankingPreviewLinks,
  shortLinks,
  onBack,
  onSelectLevel,
  onShareLevel,
  onCopyShareLink,
  onShareRankingPreview,
  onShortenShareLink,
}: LevelsScreenProps) => {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.18em] text-white">
            {category.title}
          </h2>
          <p className="text-xs text-white/80">{category.description}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
        >
          Voltar
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.07,
              },
            },
          }}
          className="h-full space-y-3 overflow-y-auto pr-1 [overscroll-behavior:contain]"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {category.levels.map((level, index) => {
            const key = `${category.id}:${level.id}`
            const linkToShow = shortLinks[key] ?? shareLinks[key]
            const rankingLink = rankingPreviewLinks[key]
            const record = records[key]

            return (
              <motion.button
                key={level.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0 },
                }}
                onClick={() => onSelectLevel(level.id)}
                className="w-full rounded-2xl border border-white/25 bg-black/35 p-4 text-left transition hover:bg-black/45"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
                      Nivel {index + 1}
                    </p>
                    <h3 className="font-display text-base font-bold uppercase tracking-[0.12em] text-white">
                      {level.title}
                    </h3>
                    <p className="text-xs text-white/80">{level.description}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70">
                      {level.mode === 'blank'
                        ? 'Sem perguntas (8 alternativas)'
                        : 'Quiz com perguntas'}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-100/80">
                      {level.timingMode === 'speedrun' ? 'Modo Speed Run' : 'Modo Sem Tempo'}
                    </p>
                    {linkToShow && (
                      <>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-200">
                          {shortLinks[key] ? 'Link curto pronto' : 'Link pronto e copiado'}
                        </p>
                        <p className="mt-1 line-clamp-2 break-all text-[10px] text-cyan-100/80">
                          {linkToShow}
                        </p>
                      </>
                    )}
                    {rankingLink && (
                      <>
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
                          Preview ranking
                        </p>
                        <p className="mt-1 line-clamp-2 break-all text-[10px] text-emerald-100/80">
                          {rankingLink}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {record ? (
                      <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100">
                        {record.score}/{record.total}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-white/25 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                        Novo
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onShareLevel(level.id)
                      }}
                      className="rounded-lg border border-cyan-200/40 bg-cyan-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-100"
                    >
                      Gerar link
                    </button>
                    {linkToShow && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onCopyShareLink(level.id)
                        }}
                        className="rounded-lg border border-white/30 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white"
                      >
                        Copiar link
                      </button>
                    )}
                    {linkToShow && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onShortenShareLink(level.id)
                        }}
                        className="rounded-lg border border-fuchsia-200/40 bg-fuchsia-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-fuchsia-100"
                      >
                        Encurtar
                      </button>
                    )}
                    {linkToShow && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onShareRankingPreview(level.id)
                        }}
                        className="rounded-lg border border-emerald-200/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-100"
                      >
                        Copiar ranking
                      </button>
                    )}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
