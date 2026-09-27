import { cva, type VariantProps } from 'class-variance-authority'

export const badgeVariants = cva(
  'w-fit rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide',
  {
    variants: {
      variant: {
        // Activo: Verde Oliva. Dado de baja / inactivo: Rojo Terracota.
        success: 'border-olive/40 bg-olive-50 text-olive-800',
        danger: 'border-accent-600/40 bg-accent-100 text-accent-800',
      },
    },
    defaultVariants: { variant: 'success' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
