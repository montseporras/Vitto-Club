import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full',
    'font-heading font-extrabold transition-[background-color,box-shadow,transform] active:translate-y-px',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-bg shadow-sm hover:bg-accent-600 hover:shadow-md active:bg-accent-700',
        secondary:
          'border border-divider/60 bg-bg/70 text-text hover:bg-surface',
        ghost: 'text-text hover:bg-surface',
      },
      size: {
        md: 'h-10 px-4 text-sm',
        // RNF-1/RNF-2: botones grandes en la pantalla de caja
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
