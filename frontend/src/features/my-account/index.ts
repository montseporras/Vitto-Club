// Puerta de entrada del feature my-account (vista del Cliente): lo único que pueden importar el
// router y los mocks, sin entrar a las carpetas internas.
export { CustomerHomePage } from './pages/CustomerHomePage'
export type {
  CustomerLevel,
  CustomerPoints,
  PointsExpiration,
} from './types/customer-points'
