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
// US-24: el modal "Ajustar puntos" lo abre la ficha del cliente (US-19 / CLI-ADM)
export { AdjustPointsModal } from './components/AdjustPointsModal'
export type {
  Consumption,
  ConsumptionPreview,
  CreateConsumptionBody,
  CreateConsumptionResult,
} from './types/consumption'
