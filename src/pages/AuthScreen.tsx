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
            className="rounded-xl border border-white/30 bg-white/90 px-3 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
          >
            Entrar com Google
          </button>
        </div>

        <p className="mt-3 text-[11px] text-white/60">
          TikTok nao e provedor nativo no Supabase Auth hoje. Se quiser, da para integrar como OIDC
          customizado.
        </p>
      </div>
    </section>
  )
}
