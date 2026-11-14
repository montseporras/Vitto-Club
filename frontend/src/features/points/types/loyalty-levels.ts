export type LoyaltyLevel = 'BRONZE' | 'SILVER' | 'GOLD'

export type LoyaltyLevelEntry = {
  level: LoyaltyLevel
  minPoints: number
  editable: boolean
}

export type LoyaltyLevelsConfiguration = {
  levels: [
    { level: 'BRONZE'; minPoints: 0; editable: false },
    { level: 'SILVER'; minPoints: number; editable: true },
    { level: 'GOLD'; minPoints: number; editable: true },
  ]
  /** Texto informativo de cada nivel (NIV-BEN, S5 §3.10); null = sin beneficio. */
  bronzeBenefit: string | null
  silverBenefit: string | null
  goldBenefit: string | null
  configurationVersion: number
  updatedAt: string
}

export type UpdateLoyaltyLevelsDto = {
  silverMinPoints: number
  goldMinPoints: number
  /** Opcionales: vacío o null borra el beneficio; si no se manda, se conserva. */
  bronzeBenefit?: string | null
  silverBenefit?: string | null
  goldBenefit?: string | null
}
