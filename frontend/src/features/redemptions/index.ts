// Puerta de entrada del feature redemptions: lo que pueden usar los demás módulos.
export { RedemptionsAdminPage } from './pages/RedemptionsAdminPage'
export { RedemptionStatusBadge } from './components/RedemptionStatusBadge'
export {
  useCustomerRedemptions,
  useMyRedemptions,
} from './api/redemptions.queries'
export {
  expiresInText,
  isExpiringSoon,
  splitDateTime,
} from './lib/format'
export { useExpiryRefetch } from './lib/use-expiry-refetch'
export { useNow } from './lib/use-now'
export type {
  MyRedemption,
  MyRedemptionFilters,
  Redemption,
  RedemptionStatus,
  RedemptionStatusGroup,
} from './types/redemption'
