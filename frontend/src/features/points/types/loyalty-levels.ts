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
  configurationVersion: number
  updatedAt: string
}

export type UpdateLoyaltyLevelsDto = {
  silverMinPoints: number
  goldMinPoints: number
}
