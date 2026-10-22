export { ManualCustomerRegistrationPage } from './pages/ManualCustomerRegistrationPage'
export { ManageRedemptionPage } from './pages/ManageRedemptionPage'
export { IdentifyCustomerPage } from './pages/IdentifyCustomerPage'
// El autorregistro (features/auth) pide los mismos datos que el alta en caja (RF-064).
export { createCustomerSchema } from './schemas/create-customer.schema'
export {
  customerConflict,
  rejectedFields,
  REJECTED_FIELD_MESSAGE,
} from './api/customer-errors'
// US-23 lo usa en el detalle del consumo (CA-22.12)
export { VoidConsumptionModal } from './components/VoidConsumptionModal'
export type { Consumption } from './types/consumption'
export type {
  Customer,
  CreateCustomerBody,
  UpdateCustomerBody,
} from './types/customer'
