// Bloque "Recompensas a las que puede acceder" del panel del cliente en Caja (US-40, CA-40.8,
// contrato §3.5.2 y §3.12.2). Muestra las del mostrador con `points <= balance` (decisión S4-2);
// con saldo negativo, ninguna.
import { useAvailableRewards, type Reward } from '@/features/rewards'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert, AlertMessages } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { formatInteger } from '@/shared/lib/numbers'

type AvailableRewardsProps = {
  /** Saldo que ya cargó la búsqueda del cliente */
  balance: number
  onRedeem: (reward: Reward) => void
}

export function AvailableRewards({ balance, onRedeem }: AvailableRewardsProps) {
  const rewards = useAvailableRewards()

  if (rewards.isLoading) return <StatusText>Cargando…</StatusText>

  if (rewards.isError) {
    return (
      <Alert variant="error">
        No se pudieron cargar las recompensas.
        <AlertMessages messages={rewards.error.messages} />
      </Alert>
    )
  }

  if (balance < 0) {
    return <StatusText>El cliente tiene un ajuste pendiente: no puede canjear.</StatusText>
  }

  const affordable = (rewards.data ?? []).filter((reward) => reward.points <= balance)
  if (affordable.length === 0) {
    return (
      <StatusText>No tiene puntos suficientes para ninguna recompensa disponible.</StatusText>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-accent-100">
      {affordable.map((reward) => (
        <li key={reward.id} className="flex items-center justify-between gap-3 py-2">
          <span>
            {reward.name}
            <br />
            <span className="text-sm text-neutral-600">{formatInteger(reward.points)} pts</span>
          </span>
          <Button type="button" variant="secondary" onClick={() => onRedeem(reward)}>
            Canjear
          </Button>
        </li>
      ))}
    </ul>
  )
}
