interface AccessDeniedScreenProps {
  email?: string
  onSignOut: () => void
}

export const AccessDeniedScreen = ({ email, onSignOut }: AccessDeniedScreenProps) => {
  return (
    <section className="mt-4 flex flex-1 flex-col justify-center">
      <div className="rounded-2xl border border-rose-300/35 bg-rose-500/15 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100/85">
          Sem permissao de admin
        </p>
        <h2 className="mt-2 font-display text-lg font-black uppercase tracking-[0.14em] text-rose-50">
          Conta sem acesso ao painel
        </h2>
        <p className="mt-2 text-sm text-rose-100/85">
          {email ? `Logado como ${email}.` : 'Conta logada sem e-mail valido.'} Adicione seu e-mail
          em <code>VITE_ADMIN_EMAILS</code> e na tabela <code>admin_users</code> do Supabase.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 rounded-xl border border-rose-200/40 bg-black/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-50"
        >
          Sair
        </button>
      </div>
    </section>
  )
}
