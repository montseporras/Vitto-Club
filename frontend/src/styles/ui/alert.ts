import { cva, type VariantProps } from 'class-variance-authority'

export const alertVariants = cva(
  'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xs',
  {
    variants: {
      variant: {
        // Verde Oliva y Rojo Terracota del manual de marca
        success: 'border-olive/40 border-l-4 border-l-olive bg-olive-50 text-olive-800',
        error: 'border-accent-600/40 border-l-4 border-l-accent-600 bg-accent-50 text-accent-800',
      },
    },
    defaultVariants: { variant: 'error' },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>

export const alertIconStyles = 'mt-0.5 size-5 shrink-0'

/** Lista de mensajes de detalle dentro de una alerta. */
export const alertListStyles = 'mt-1 list-disc pl-5'
