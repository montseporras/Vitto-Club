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
export type {
  Customer,
  CreateCustomerBody,
  UpdateCustomerBody,
} from './types/customer'
export type { CustomerPoints, PointsMovement } from './types/points'
// Clientes del Administrador (features/customers) reutiliza el alta, el saldo y los movimientos.
export {
  CustomerRegistrationForm,
  CUSTOMER_REGISTERED_MESSAGE,
} from './components/CustomerRegistrationForm'
export { useCustomerMovements, useCustomerPoints } from './api/cashier.queries'
export { customerFieldsSchema } from './schemas/create-customer.schema'
