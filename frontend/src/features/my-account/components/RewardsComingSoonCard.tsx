// Tarjeta fija "Recompensas" del Inicio del Cliente (US-19, CA-19.8). El catálogo y los canjes son
// del Sprint 4: por ahora solo se avisa con el texto del contrato (§3.10.1).
import { Badge } from '@/shared/components/ui/Badge'

export function RewardsComingSoonCard() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-accent-200 p-4 text-sm opacity-80">
      <p>
        <strong className="block">Recompensas</strong>
        <span className="text-neutral-600">
          El catálogo y los canjes van a estar disponibles próximamente.
        </span>
      </p>
      <Badge className="shrink-0 border-accent-200 bg-accent-100 text-accent-800">
        Próximamente
      </Badge>
    </div>
  )
}
