import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-white/25 bg-black/30 px-2 py-2 text-sm text-white placeholder:text-white/45',
      className,
    )}
    {...props}
  />
))

Input.displayName = 'Input'
