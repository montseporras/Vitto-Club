import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full',
    'font-bold transition-[background-color,box-shadow,transform] active:translate-y-px',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-700',
    'disabled:pointer-events-none disabled:opacity-60',
  ],
  {
    variants: {
      variant: {
        primary:
          // Naranja oscuro: sobre el #DA864D el texto blanco no se lee bien
          'bg-accent-700 text-white shadow-md shadow-accent-800/25 hover:bg-accent-800 hover:shadow-lg active:bg-accent-900',
        secondary:
          'border border-accent-300 bg-surface text-accent-800 hover:bg-accent-50',
        ghost: 'text-accent-800 hover:bg-accent-50',
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
