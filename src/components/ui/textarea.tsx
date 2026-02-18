import { cn } from '@/lib/utils'
import type { TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm text-white placeholder:text-white/45',
        className,
      )}
      {...props}
    />
  ),
)

Textarea.displayName = 'Textarea'
