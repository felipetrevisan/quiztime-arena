import { copyText } from '@/utils/share'
import { useMemo, useState } from 'react'

interface RespondResultScreenProps {
  score: number
  total: number
  levelTitle: string
  responderName: string
  responderAvatarDataUrl: string | null
  onResponderNameChange: (value: string) => void
  onResponderAvatarUpload: (file: File) => void
  onBuildSubmissionLink: () => string
}

export const RespondResultScreen = ({
  score,
  total,
  levelTitle,
  responderName,
  responderAvatarDataUrl,
  onResponderNameChange,
  onResponderAvatarUpload,
  onBuildSubmissionLink,
}: RespondResultScreenProps) => {
  const [submissionLink, setSubmissionLink] = useState('')
  const [copied, setCopied] = useState(false)

  const percent = useMemo(() => {
    if (!total) return 0
    return Math.round((score / total) * 100)
  }, [score, total])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
          Modo resposta
        </p>
        <h2 className="mt-2 font-display text-xl font-black uppercase tracking-[0.15em] text-white">
          {levelTitle}
        </h2>
        <p className="mt-2 text-sm text-white/85">
          Pontuacao:{' '}
          <strong>
            {score}/{total}
          </strong>{' '}
          ({percent}%)
        </p>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-white/20 bg-black/30 p-3">
        <div className="flex items-center gap-3">
          <img
            src={responderAvatarDataUrl ?? '/assets/cartoons/template.svg'}
            alt="Avatar do jogador"
            className="h-14 w-14 rounded-full border border-white/30 object-cover"
          />
          <label className="cursor-pointer rounded-lg border border-white/30 bg-black/35 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            Upload avatar
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                onResponderAvatarUpload(file)
              }}
            />
          </label>
        </div>

        <label
          htmlFor="responder-name"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75"
        >
          Seu nome
        </label>
        <input
          id="responder-name"
          value={responderName}
          onChange={(event) => onResponderNameChange(event.target.value)}
          placeholder="Ex: Ana"
          className="w-full rounded-xl border border-white/30 bg-black/25 px-3 py-2 text-sm text-white outline-none"
        />

        <button
          type="button"
          onClick={() => {
            if (!responderName.trim()) return
            const link = onBuildSubmissionLink()
            setSubmissionLink(link)
            setCopied(false)
          }}
          className="w-full rounded-xl border border-white/25 bg-white/90 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-900"
        >
          Gerar link de envio
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/20 bg-black/25 p-3">
        {submissionLink ? (
          <>
            <p className="text-xs text-white/80">
              Envie este link para o criador do quiz importar seu resultado:
            </p>
            <textarea
              readOnly
              value={submissionLink}
              className="mt-2 h-28 w-full resize-none rounded-xl border border-white/20 bg-black/40 p-2 text-[11px] text-white/90"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await copyText(submissionLink)
                setCopied(ok)
              }}
              className="mt-2 rounded-lg border border-white/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              {copied ? 'Link copiado' : 'Copiar link'}
            </button>
          </>
        ) : (
          <p className="text-xs text-white/75">
            Preencha seu nome e gere o link para enviar sua pontuacao.
          </p>
        )}
      </div>
    </section>
  )
}
