// Este archivo es la puerta de entrada del feature points: define qué pueden usar los
// demás módulos (el layout del admin y los mocks) sin entrar a sus carpetas internas...
export { PointsSettingsPage } from './pages/PointsSettingsPage';
export type {
  BonusType,
  FirstPurchaseBonus,
  UpdateFirstPurchaseBonusDto,
} from './types/first-purchase-bonus';
export type {
  PointsEquivalence,
  UpdatePointsEquivalenceDto,
} from './types/points-equivalence';
