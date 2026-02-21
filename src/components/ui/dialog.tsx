import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'
import { createContext, useContext, useEffect } from 'react'

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpenChange, open])

  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
}

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const DialogContent = ({ className, children, ...props }: DialogContentProps) => {
  const context = useContext(DialogContext)
  if (!context?.open) {
    return null
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: false positive
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={() => context.onOpenChange(false)}
    >
      <div
        // biome-ignore lint/a11y/useSemanticElements: role is ok
        role="dialog"
        aria-modal="true"
        className={cn(
          'w-full max-w-2xl rounded-2xl border border-white/20 bg-[#111324] p-4 text-white shadow-2xl',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-1', className)} {...props} />
)

export const DialogTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn('text-sm font-bold uppercase tracking-[0.14em] text-white', className)}
    {...props}
  />
)

export const DialogDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-white/70', className)} {...props} />
)

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 flex items-center justify-end gap-2', className)} {...props} />
)
