// Lista "Próximos vencimientos" del Inicio del Cliente (US-19, CA-19.8). Muestra los lotes que
// manda el backend en nextExpirations (como máximo 5), o el texto de lista vacía.
import { isoToDisplayDate } from '@/shared/lib/dates'
import type { PointsExpiration } from '../types/customer-points'
import { formatPoints } from './format-points'

type NextExpirationsProps = {
  expirations: PointsExpiration[]
}

export function NextExpirations({ expirations }: NextExpirationsProps) {
  return (
    <section aria-labelledby="next-expirations-title">
      <h3
        id="next-expirations-title"
        className="mb-3 border-b border-accent-200 pb-1.5 font-sans text-sm font-bold uppercase tracking-[0.08em]"
      >
        Próximos vencimientos
      </h3>

      {expirations.length === 0 ? (
        <p className="text-sm text-neutral-600">No tenés puntos por vencer.</p>
      ) : (
        <ul className="grid gap-3">
          {expirations.map((expiration) => (
            <li
              key={expiration.expiresAt}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-accent-200 bg-surface px-3.5 py-3 text-sm"
            >
              <strong>{formatPoints(expiration.points)} pts</strong>
              {/* expiresAt ya viene como día en hora de Argentina: solo se reordena */}
              <span className="text-neutral-600">
                vencen el {isoToDisplayDate(expiration.expiresAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
