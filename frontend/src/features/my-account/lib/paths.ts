// Rutas de la vista del Cliente y cómo armar las que llevan parámetros.
import { CUSTOMER_PATHS } from '@/shared/lib/customer-paths'

export { CUSTOMER_PATHS }


/** Pestaña del Historial que se abre: Consumos (por defecto) o Canjes. */
export const HISTORY_VIEW_PARAM = 'vista'
export const HISTORY_REDEMPTIONS_VIEW = 'canjes'

export const promotionPath = (slug: string) => `${CUSTOMER_PATHS.root}/promos/${slug}`
export const rewardPath = (id: number) => `${CUSTOMER_PATHS.rewards}/${id}`
export const historyRedemptionsPath = () =>
  `${CUSTOMER_PATHS.history}?${HISTORY_VIEW_PARAM}=${HISTORY_REDEMPTIONS_VIEW}`
