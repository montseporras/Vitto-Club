import type { ReactNode } from 'react'
import { RewardImage } from '@/features/rewards'
import { formatInteger } from '@/shared/lib/numbers'

type RewardSummaryProps = {
  name: string
  description: string | null
  points: number
  /** Foto de la recompensa; `null` = imagen genérica (S5 §3.5.2) */
  photoUrl: string | null
  /** Etiqueta de vencimiento, si corresponde (modal de Caja) */
  tag?: ReactNode
}

/** Foto (o la imagen genérica), nombre, descripción y puntos de la recompensa (S5 §3.5.2). */
export function RewardSummary({ name, description, points, photoUrl, tag }: RewardSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <RewardImage
        photoUrl={photoUrl}
        className="size-22 rounded-2xl"
        genericClassName="bg-orange-100 text-accent-700"
        iconClassName="size-9"
      />
      <div className="min-w-0">
        <p className="text-lg font-bold">{name}</p>
        {description && <p className="mt-0.5 text-sm text-neutral-700">{description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-accent-800">{formatInteger(points)} pts</span>
          {tag}
        </div>
      </div>
    </div>
  )
}
