import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'
import { forwardRef } from 'react'

type ButtonVariant = 'default' | 'outline' | 'ghost'
type ButtonSize = 'default' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-white/90 text-slate-900 border-white/25',
  outline: 'bg-black/30 text-white border-white/25',
  ghost: 'bg-transparent text-white border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'px-2 py-2 text-xs tracking-[0.12em]',
  sm: 'px-2 py-1 text-[10px] tracking-[0.12em]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'rounded-lg border font-bold uppercase transition disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
