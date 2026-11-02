import { useEffect, useRef } from 'react'
import type { RedemptionStatus } from '../types/redemption'
import { useNow } from './use-now'

type Expirable = { id: number; status: RedemptionStatus; expiresAt: string }

/**
 * Cuenta regresiva de los canjes Confirmados de una lista. Devuelve la hora actual (se actualiza
 * cada segundo mientras haya alguno) y, cuando la cuenta de un canje llega a 0, vuelve a pedir la
 * lista una sola vez por canje: el backend lo vence al leer y aparece "Vencido" (CA-45.4, §3.11).
 */
export function useExpiryRefetch(items: Expirable[] | undefined, refetch: () => unknown) {
  const hasConfirmed = Boolean(items?.some((item) => item.status === 'CONFIRMED'))
  const now = useNow(1000, hasConfirmed)
  const handled = useRef(new Set<number>())

  useEffect(() => {
    const expired = (items ?? []).filter(
      (item) =>
        item.status === 'CONFIRMED' &&
        new Date(item.expiresAt).getTime() <= now &&
        !handled.current.has(item.id),
    )
    if (expired.length === 0) return
    expired.forEach((item) => handled.current.add(item.id))
    void refetch()
  }, [items, now, refetch])

  return now
}
