import type { Redemption } from '../types/redemption'

/** Quién resolvió el canje, para la tabla y el modal: el empleado, "Sistema" o "El cliente". */
export function resolverName(redemption: Redemption) {
  if (redemption.status === 'CANCELLED') return 'El cliente'
  if (!redemption.resolvedBy) return ''
  return redemption.resolvedBy.actorType === 'SYSTEM' ? 'Sistema' : redemption.resolvedBy.name
}
