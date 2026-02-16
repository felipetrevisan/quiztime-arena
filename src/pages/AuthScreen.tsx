import type { AccessMode } from '@/types/quiz'

interface AuthScreenProps {
  mode: AccessMode
  onGoogleLogin: () => void
}

const modeLabel: Record<AccessMode, string> = {
  admin: 'Acesso do painel',
  responder: 'Responder quiz',
  ranking: 'Preview de ranking',
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7 12.8 19c1.8-4.2 6-7 11.2-7 3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 10-2 13.5-5.1l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.5 16.3 44 24 44"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3a12.2 12.2 0 0 1-4 5.7l.1-.1 6.2 5.2C37.2 39.1 44 34 44 24c0-1.3-.1-2.4-.4-3.5"
    />
  </svg>
)

export const AuthScreen = ({ mode, onGoogleLogin }: AuthScreenProps) => {
  return (
    <section className="mt-4 flex flex-1 flex-col justify-center">
      <div className="rounded-2xl border border-white/20 bg-black/30 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Login necessario
        </p>
        <h2 className="mt-2 font-display text-xl font-black uppercase tracking-[0.14em] text-white">
          {modeLabel[mode]}
        </h2>
        <p className="mt-2 text-sm text-white/85">
          Entre com rede social para continuar e salvar suas informacoes no ranking.
        </p>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onGoogleLogin}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/90 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </div>
      </div>
    </section>
  )
}
