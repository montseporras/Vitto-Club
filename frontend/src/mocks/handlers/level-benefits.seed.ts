// Beneficio de cada nivel (NIV-BEN, S5 §3.10) que comparten los mocks. Lo escribe el PUT de
// /loyalty/configuration/levels (points.handlers) y lo leen los mocks de puntos del Cliente y de la
// ficha, igual que el backend lee la versión vigente de la configuración. Textos de ejemplo del prototipo.
import type { Level } from '@/domain/levels'

export type LevelBenefitTexts = {
  bronzeBenefit: string | null
  silverBenefit: string | null
  goldBenefit: string | null
}

export const levelBenefits: LevelBenefitTexts = {
  bronzeBenefit: 'Acumulación estándar de puntos',
  silverBenefit: 'Postre gratis en tu cumpleaños',
  goldBenefit: 'Café gratis una vez por semana',
}

export const setLevelBenefits = (next: LevelBenefitTexts) => {
  Object.assign(levelBenefits, next)
}

const benefitOf = (level: Level | null): string | null => {
  if (level === 'BRONZE') return levelBenefits.bronzeBenefit
  if (level === 'SILVER') return levelBenefits.silverBenefit
  if (level === 'GOLD') return levelBenefits.goldBenefit
  return null
}

/** Suma `benefit` y `nextBenefit` (null en Oro) al nivel de un cliente, como `…/puntos`. */
export const withLevelBenefits = <T extends { current: Level; next: Level | null }>(
  level: T,
) => ({
  ...level,
  benefit: benefitOf(level.current),
  nextBenefit: benefitOf(level.next),
})
