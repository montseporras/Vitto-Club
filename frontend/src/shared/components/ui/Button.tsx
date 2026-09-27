import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, type ButtonVariants } from '@/styles/ui'

export type ButtonProps = ComponentProps<'button'> & ButtonVariants

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
