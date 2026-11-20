import type { DocumentType } from '@/domain/documents'

export type MissionObjectiveType = 'CONSUMPTION_COUNT' | 'CONSUMPTION_AMOUNT'
export type MissionPhase = 'RUNNING' | 'UPCOMING' | 'FINISHED'
export type MissionStatus = 'ACTIVE' | 'DELETED'
export type CustomerMissionStatus = 'COMPLETED' | 'CLAIMED'
export type MissionClaimedBy = 'CUSTOMER' | 'SYSTEM'

export type MissionPendingChanges = {
  appliesFrom: string
  objectiveType: MissionObjectiveType
  target: number
  daysOfWeek: number[] | null
  timeFrom: string | null
  timeTo: string | null
  rewardPoints: number | null
}

export type Mission = {
  id: number
  name: string
  description: string | null
  objectiveType: MissionObjectiveType
  target: number
  daysOfWeek: number[] | null
  timeFrom: string | null
  timeTo: string | null
  rewardPoints: number | null
  startMonth: string
  endMonth: string | null
  status: MissionStatus
  phase: MissionPhase
  pendingChanges: MissionPendingChanges | null
  completedCount: number
  createdAt: string
  updatedAt: string
}

export type MissionListOrder = 'RECENT' | 'OLDEST'

export type MissionListFilters = {
  q: string
  phase: MissionPhase | ''
  order: MissionListOrder
  page: number
  limit?: number
}

export type CreateMissionBody = {
  name: string
  description: string
  objectiveType: MissionObjectiveType
  target: number
  daysOfWeek: number[] | null
  timeFrom: string | null
  timeTo: string | null
  rewardPoints: number | null
  startMonth: string
  endMonth: string | null
}

export type UpdateMissionBody = Partial<CreateMissionBody>

export type UpdateMissionResponse = {
  mission: Mission
  appliesFrom: string | null
}

export type DeleteMissionResponse = {
  expired: number
  claimed: number
}

export type CompletedMissionCustomer = {
  id: number
  firstName: string
  lastName: string
  documentType: DocumentType
  documentNumber: string
}

type CompletedMissionFields = {
  customerMissionId: number
  customer: CompletedMissionCustomer
  status: CustomerMissionStatus
  completedAt: string
  rewardPoints: number | null
}

export type CompletedMission = CompletedMissionFields &
  (
    | {
        status: 'COMPLETED'
        claimedAt: null
        claimedBy: null
      }
    | {
        status: 'CLAIMED'
        claimedAt: string
        claimedBy: MissionClaimedBy
      }
  )
