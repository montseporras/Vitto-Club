import { DomainError } from './errors/domain.error.js';
import { PAST_EXPIRATION_MESSAGE } from './new-reward.js';
import type { RewardDisabledReason, RewardStatus } from './reward.js';

// US-35 (contrato S4 §3.2.4): qué campos cambian al editar una recompensa. Función pura: el stock
// contra los canjes confirmados y el nombre repetido los valida el servicio, porque necesitan la
// base. La disponibilidad (§3.4) no se decide acá: después de guardar, el servicio llama a
// RewardsAvailabilityService.reevaluarDisponibilidad de US-37 (decisión de Jazmín: una sola regla
// para editar, usar y el proceso diario).

// Lo que manda el Administrador: solo vienen los campos que quiere cambiar
export type RewardEditInput = {
  name?: string;
  description?: string | null;
  points?: number;
  stock?: number | null;
  expiresAt?: string | null;
};

export type RewardEditableState = {
  name: string;
  description: string | null;
  points: number;
  stock: number | null;
  // YYYY-MM-DD; null = no vence
  expiresAt: string | null;
  status: RewardStatus;
  disabledReason: RewardDisabledReason | null;
};

export const EDITABLE_REWARD_FIELDS = ['name', 'description', 'points', 'stock', 'expiresAt'] as const;
export type EditableRewardField = (typeof EDITABLE_REWARD_FIELDS)[number];

type FieldValue = string | number | null;
export type RewardFieldChange = { field: EditableRewardField; before: FieldValue; after: FieldValue };

export type RewardEditPlan = {
  // En el orden de EDITABLE_REWARD_FIELDS. Vacío = no cambió nada (no se guarda ni se audita)
  changes: RewardFieldChange[];
  // Con los campos editados; el estado y el motivo quedan como estaban (los reevalúa US-37)
  next: RewardEditableState;
};

export function planRewardEdit(
  current: RewardEditableState,
  input: RewardEditInput,
  hoyArgentina: string,
): RewardEditPlan {
  // Se valida siempre que venga, aunque sea la misma fecha (CA-35.2, CA-35.8)
  if (input.expiresAt !== undefined && input.expiresAt !== null && input.expiresAt < hoyArgentina) {
    throw new DomainError(PAST_EXPIRATION_MESSAGE, 'expiresAt');
  }

  const requested: Partial<Record<EditableRewardField, FieldValue>> = {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.points !== undefined ? { points: input.points } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
  };

  const changes = EDITABLE_REWARD_FIELDS.filter(
    (field) => field in requested && requested[field] !== current[field],
  ).map((field) => ({ field, before: current[field], after: requested[field] as FieldValue }));

  return {
    changes,
    next: changes.length === 0 ? current : ({ ...current, ...requested } as RewardEditableState),
  };
}
