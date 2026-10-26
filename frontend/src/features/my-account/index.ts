// Barrel del feature my-account (vista del Cliente): lo único que otros módulos deben importar.
export { CustomerHomePage } from './pages/CustomerHomePage'
export { MyProfilePage } from './pages/MyProfilePage'
export { ChangePasswordModal } from './components/ChangePasswordModal'
export { PointsHistory } from './components/PointsHistory'
export type { MyPoints, MyProfile } from './types/my-account'
export type {
  CustomerLevel,
  CustomerPoints,
  PointsExpiration,
} from './types/customer-points'
