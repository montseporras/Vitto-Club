import { useContext } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { cardStyles, cardTitleStyles } from '@/styles/ui'
import { CardDensityContext } from './card-density'

type CardProps = ComponentProps<'article'> & {
  /** Menos aire alrededor y título de 20 px (Configuración → Puntos). */
  compact?: boolean
}

/** Tarjeta secundaria dentro de una pantalla. */
export function Card({ className, compact, ...props }: CardProps) {
  return (
    <CardDensityContext.Provider value={compact ? 'compact' : 'default'}>
      <article
        className={cn(cardStyles, compact && 'px-5 py-4 sm:px-5 sm:py-4', className)}
        {...props}
      />
    </CardDensityContext.Provider>
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  const compact = useContext(CardDensityContext) === 'compact'
  return <h3 className={cn(cardTitleStyles, compact && 'text-xl', className)} {...props} />
}
