import { useState } from 'react'
import { CustomerMissionsPanel, useMyCustomerMissions } from '@/features/missions'

export function MyMissionsPage() {
  const [period, setPeriod] = useState('')
  const missions = useMyCustomerMissions(period || undefined)

  return (
    <CustomerMissionsPanel
      missions={missions.data}
      period={period}
      onPeriodChange={setPeriod}
      isPending={missions.isPending}
      error={missions.error}
      showCustomerNote
    />
  )
}
