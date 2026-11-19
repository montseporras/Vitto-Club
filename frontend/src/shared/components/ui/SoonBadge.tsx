import { cn } from '@/shared/lib/utils'

/** Etiqueta "Próximamente" para lo que todavía no está disponible (ver shared/lib/features.ts). */
export function SoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-accent-800 uppercase',
        className,
      )}
    >
      Próximamente
    </span>
  )
}
