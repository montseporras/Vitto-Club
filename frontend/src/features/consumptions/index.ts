// Puerta de entrada del feature consumptions: lo que pueden usar los demás módulos.
export { CustomerConsumptionHistory } from './components/CustomerConsumptionHistory';
export { CustomerHistoryPage } from './pages/CustomerHistoryPage';
// Sección Consumos del Administrador (US-23): listado y detalle
export { ConsumptionsPage } from './pages/ConsumptionsPage';
export { ConsumptionDetailPage } from './pages/ConsumptionDetailPage';
export type {
  ConsumptionStatus,
  CustomerConsumption,
  PaginatedConsumptions,
} from './types/consumption';
