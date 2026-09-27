import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { cardStyles, cardTitleStyles } from '@/styles/ui'

/** Tarjeta secundaria dentro de una pantalla. */
export function Card({ className, ...props }: ComponentProps<'article'>) {
  return <article className={cn(cardStyles, className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn(cardTitleStyles, className)} {...props} />
}
