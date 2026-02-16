interface HomeScreenProps {
  isAdmin: boolean
  canOpenPlay: boolean
  onStart: () => void
  onOpenPlay: () => void
  onOpenBuilder: () => void
  onOpenRanking: () => void
  onOpenMyQuizzes: () => void
  canOpenMyQuizzes: boolean
}

const StarIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="m10 1.5 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" />
  </svg>
)

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M6 4.5a1 1 0 0 1 1.5-.9l8 5a1 1 0 0 1 0 1.8l-8 5A1 1 0 0 1 6 14.5z" />
  </svg>
)

const TrophyIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M6 2a1 1 0 0 0-1 1v1H3a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4h.1A4 4 0 0 0 9 12.9V15H7.5a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H11v-2.1A4 4 0 0 0 13.9 10H14a4 4 0 0 0 4-4V5a1 1 0 0 0-1-1h-2V3a1 1 0 0 0-1-1zM4 6V6h1a2 2 0 0 1-2 2V6zm12 0v2a2 2 0 0 1-2-2z" />
  </svg>
)

const UserCheckIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8m-6 14a6 6 0 1 1 12 0z" />
    <path d="M14.7 7.3a1 1 0 0 1 1.4 0l.9.9 1.9-1.9a1 1 0 1 1 1.4 1.4l-2.6 2.6a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4" />
  </svg>
)

const WrenchIcon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <path d="M11.6 2.2a4 4 0 0 0-3.8 5.1L2.3 12.8a1 1 0 0 0 0 1.4l3.5 3.5a1 1 0 0 0 1.4 0l5.5-5.5a4 4 0 0 0 5.1-3.8l-2.2 1.1-2.1-2.1z" />
  </svg>
)

export const HomeScreen = ({
  isAdmin,
  canOpenPlay,
  onStart,
  onOpenPlay,
  onOpenBuilder,
  onOpenRanking,
  onOpenMyQuizzes,
  canOpenMyQuizzes,
}: HomeScreenProps) => {
  return (
    <section className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
      <p className="mb-3 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
        Game Show Edition
      </p>
      <h2 className="font-display text-4xl font-black uppercase tracking-[0.2em] text-white sm:text-5xl">
        QuizTime
      </h2>

      <div className="mt-8 grid w-full max-w-xs gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/90 px-7 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900 shadow-lg transition hover:scale-[1.02]"
          >
            <StarIcon />
            Comecar
          </button>
        )}
        {canOpenPlay && (
          <button
            type="button"
            onClick={onOpenPlay}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-fuchsia-200/45 bg-fuchsia-500/20 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-fuchsia-100"
          >
            <PlayIcon />
            Jogar quizzes
          </button>
        )}
        <button
          type="button"
          onClick={onOpenRanking}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-black/30 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          <TrophyIcon />
          Ver ranking
        </button>
        {canOpenMyQuizzes && (
          <button
            type="button"
            onClick={onOpenMyQuizzes}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/45 bg-emerald-500/20 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-100"
          >
            <UserCheckIcon />
            Meus quizzes
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenBuilder}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/45 bg-cyan-500/20 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100"
          >
            <WrenchIcon />
            Abrir builder
          </button>
        )}
      </div>
    </section>
  )
}
