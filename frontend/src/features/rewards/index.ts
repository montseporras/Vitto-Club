// Puerta de entrada del feature rewards: lo que pueden usar los demás módulos.
export { RewardExpiryTag } from './components/RewardExpiryTag'
export { useAvailableRewards, useMyCatalog } from './api/rewards.queries'
export { rewardsKeys } from './api/rewards.keys'
export { rewardExpiryLabel } from './lib/expiry-label'
export type {
  CatalogFilter,
  CatalogReward,
  CustomerCatalog,
  Reward,
  RewardDisabledReason,
  RewardStatus,
} from './types/reward'
