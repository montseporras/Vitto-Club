// Puerta de entrada del feature rewards: lo que pueden usar los demás módulos.
export { RewardExpiryTag } from './components/RewardExpiryTag'
export { RewardsAdminPage } from './pages/RewardsAdminPage'
export {
  useAdminRewards,
  useAvailableRewards,
  useCreateReward,
  useMyCatalog,
} from './api/rewards.queries'
export { rewardsKeys } from './api/rewards.keys'
export { rewardExpiryLabel } from './lib/expiry-label'
export type {
  AdminReward,
  CatalogFilter,
  CatalogReward,
  CreateRewardBody,
  CustomerCatalog,
  Reward,
  RewardDisabledReason,
  RewardListFilters,
  RewardListStatus,
  RewardStatus,
} from './types/reward'
