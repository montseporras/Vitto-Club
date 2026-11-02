import type { DocumentType } from '@/domain/documents'
import type { RedemptionStatus } from '../types/redemption'

/** Lo que muestra el formulario de la pantalla Canjes; recién se aplica al apretar "Filtrar". */
export type DraftRedemptionFilters = {
  documentType: DocumentType
  documentNumber: string
  code: string
  rewardName: string
  status: RedemptionStatus | ''
  fromDate: string
  toDate: string
  order: 'desc' | 'asc'
}

export const emptyDraftFilters: DraftRedemptionFilters = {
  documentType: 'DNI',
  documentNumber: '',
  code: '',
  rewardName: '',
  status: '',
  fromDate: '',
  toDate: '',
  order: 'desc',
}
