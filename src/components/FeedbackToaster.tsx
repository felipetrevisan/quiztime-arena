import type { FeedbackTone } from '@/utils/feedback'

export interface ToastItem {
  id: string
  message: string
  tone: FeedbackTone
}

interface FeedbackToasterProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

const toneClassName: Record<FeedbackTone, string> = {
  info: 'border-cyan-200/45 bg-cyan-500/20 text-cyan-100',
  success: 'border-emerald-200/45 bg-emerald-500/20 text-emerald-100',
  error: 'border-rose-200/45 bg-rose-500/20 text-rose-100',
}

export const FeedbackToaster = ({ toasts, onDismiss }: FeedbackToasterProps) => {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[90] mx-auto flex w-full max-w-[480px] flex-col gap-2 px-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          // biome-ignore lint/a11y/useSemanticElements: role is ok
          role="status"
          className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-2xl backdrop-blur ${toneClassName[toast.tone]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em]">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md border border-white/25 bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/90"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
