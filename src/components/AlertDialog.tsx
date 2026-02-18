import { useEffect } from 'react'

interface AlertDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export const AlertDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: AlertDialogProps) => {
  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel, open])

  if (!open) {
    return null
  }

  const confirmClassName =
    tone === 'danger'
      ? 'border-rose-300/45 bg-rose-500/25 text-rose-50'
      : 'border-emerald-300/45 bg-emerald-500/20 text-emerald-100'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#111324] p-4 shadow-2xl"
      >
        <h3
          id="alert-dialog-title"
          className="text-sm font-bold uppercase tracking-[0.12em] text-white"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-white/80">{message}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/30 bg-black/30 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
