// Cómo se abre la pestaña Canjes del Cliente en cada vista: sin parámetro va a Mis canjes (US-45) y
// con `?vista=catalogo` al Catálogo (US-39). Lo usan la pestaña y las tarjetas del Inicio.
export const REDEMPTIONS_VIEW_PARAM = 'vista'
export const CATALOG_REDEMPTIONS_VIEW = 'catalogo'

/** URL de Mis canjes (la vista por defecto) a partir de la ruta de la pestaña Canjes. */
export const myRedemptionsUrl = (redemptionsPath: string) => redemptionsPath

/** URL del Catálogo a partir de la ruta de la pestaña Canjes. */
export const catalogUrl = (redemptionsPath: string) =>
  `${redemptionsPath}?${REDEMPTIONS_VIEW_PARAM}=${CATALOG_REDEMPTIONS_VIEW}`
