// Barrel del feature my-account (vista del Cliente): lo único que otros módulos deben importar.
export { CustomerHomePage } from './pages/CustomerHomePage'
export { MyHistoryPage } from './pages/MyHistoryPage'
export { MyProfilePage } from './pages/MyProfilePage'
export { MyRedemptionsPage } from './pages/MyRedemptionsPage'
export { PromotionPage } from './pages/PromotionPage'
export { MissionsPage } from './pages/MissionsPage'
export { RewardsPage } from './pages/RewardsPage'
export { RewardDetailPage } from './pages/RewardDetailPage'
export { ProfileDataPage } from './pages/ProfileDataPage'
export { MyLevelPage } from './pages/MyLevelPage'
export { NotificationsInfoPage } from './pages/NotificationsInfoPage'
export { HelpPage } from './pages/HelpPage'
export { ConfirmRedemptionFlow } from './components/ConfirmRedemptionFlow'
export { ChangePasswordModal } from './components/ChangePasswordModal'
export { PointsHistory } from './components/PointsHistory'
export type { MyPoints, MyProfile } from './types/my-account'
export type {
  CustomerLevel,
  CustomerPoints,
  PointsExpiration,
} from './types/customer-points'
export type { MyMission, MyMissionStatus } from './types/missions'
