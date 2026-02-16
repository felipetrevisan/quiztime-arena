interface HomeScreenProps {
  isAdmin: boolean
  onStart: () => void
  onOpenBuilder: () => void
  onOpenRanking: () => void
  onOpenMyQuizzes: () => void
  canOpenMyQuizzes: boolean
}

export const HomeScreen = ({
  isAdmin,
  onStart,
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
      <p className="mt-4 max-w-xs text-sm text-white/90">
        Entre no frame 9:16, escolha sua categoria e marca V ou X como em uma folha de resposta
        estilosa.
      </p>

      <div className="mt-8 grid w-full max-w-xs gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={onStart}
            className="rounded-2xl border border-white/30 bg-white/90 px-7 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900 shadow-lg transition hover:scale-[1.02]"
          >
            Comecar
          </button>
        )}
        <button
          type="button"
          onClick={onOpenRanking}
          className="rounded-2xl border border-white/30 bg-black/30 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
        >
          Ver ranking
        </button>
        {canOpenMyQuizzes && (
          <button
            type="button"
            onClick={onOpenMyQuizzes}
            className="rounded-2xl border border-emerald-200/45 bg-emerald-500/20 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-emerald-100"
          >
            Meus quizzes
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenBuilder}
            className="rounded-2xl border border-cyan-200/45 bg-cyan-500/20 px-7 py-3 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100"
          >
            Abrir builder
          </button>
        )}
      </div>
    </section>
  )
}
