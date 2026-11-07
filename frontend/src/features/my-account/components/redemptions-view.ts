// Cómo se abre la pestaña Canjes del Cliente en cada vista: sin parámetro va al Catálogo (US-39) y
// con `?vista=mis` a Mis canjes (US-45). Lo usan la pestaña y las tarjetas del Inicio.
export const REDEMPTIONS_VIEW_PARAM = 'vista'
export const MY_REDEMPTIONS_VIEW = 'mis'

/** URL de Mis canjes a partir de la ruta de la pestaña Canjes. */
export const myRedemptionsUrl = (redemptionsPath: string) =>
  `${redemptionsPath}?${REDEMPTIONS_VIEW_PARAM}=${MY_REDEMPTIONS_VIEW}`
