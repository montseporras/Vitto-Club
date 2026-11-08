import { DomainError } from './errors/domain.error.js';
import { PAST_EXPIRATION_MESSAGE } from './new-reward.js';
import type { RewardDisabledReason, RewardStatus } from './reward.js';

// US-35 (contrato S4 §3.2.4 y §3.4): qué cambia al editar una recompensa. Función pura: el stock
// contra los canjes confirmados y el nombre repetido los valida el servicio, porque necesitan la
// base.

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

// §3.2.4: "ENABLED", "DISABLED" o null en la respuesta
export type AvailabilityChange = 'ENABLED' | 'DISABLED' | null;

export type RewardEditPlan = {
  // En el orden de EDITABLE_REWARD_FIELDS. Vacío = no cambió nada (no se guarda ni se audita)
  changes: RewardFieldChange[];
  next: RewardEditableState;
  availabilityChange: AvailabilityChange;
  // Con ENABLED: el motivo por el que estaba deshabilitada (decide "Stock repuesto" o "Fecha de
  // vencimiento actualizada")
  enabledFrom: RewardDisabledReason | null;
};

// Por qué no está disponible (sin mirar el estado). null = tiene stock y no venció.
function unavailableReasons(state: RewardEditableState, hoyArgentina: string): RewardDisabledReason[] {
  const reasons: RewardDisabledReason[] = [];
  if (state.stock !== null && state.stock <= 0) reasons.push('OUT_OF_STOCK');
  if (state.expiresAt !== null && state.expiresAt < hoyArgentina) reasons.push('EXPIRED');
  return reasons;
}

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

  if (changes.length === 0) {
    return { changes, next: current, availabilityChange: null, enabledFrom: null };
  }

  const edited = { ...current, ...requested } as RewardEditableState;
  return { changes, ...reevaluateAvailability(current, edited, hoyArgentina) };
}

// §3.4, al editar. INACTIVE no cambia (CA-35.7). Una DISABLED que sigue sin estar disponible
// actualiza su motivo al que corresponde ahora, sin auditar (decisión de Jazmín): una Agotada a la
// que se repone el stock pero ya venció pasa a Vencida, y al revés.
function reevaluateAvailability(
  current: RewardEditableState,
  edited: RewardEditableState,
  hoyArgentina: string,
): Omit<RewardEditPlan, 'changes'> {
  const reasons = unavailableReasons(edited, hoyArgentina);

  if (current.status === 'DISABLED') {
    if (reasons.length === 0) {
      return {
        next: { ...edited, status: 'ACTIVE', disabledReason: null },
        availabilityChange: 'ENABLED',
        enabledFrom: current.disabledReason,
      };
    }
    // Si el motivo de antes sigue valiendo se conserva; si no, el que corresponde ahora
    const reason =
      current.disabledReason !== null && reasons.includes(current.disabledReason) ? current.disabledReason : reasons[0];
    return { next: { ...edited, disabledReason: reason }, availabilityChange: null, enabledFrom: null };
  }

  // Solo el stock en 0 la deshabilita al editar; la fecha vencida la marca el proceso diario (US-37)
  if (current.status === 'ACTIVE' && edited.stock === 0) {
    return {
      next: { ...edited, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' },
      availabilityChange: 'DISABLED',
      enabledFrom: null,
    };
  }

  return { next: edited, availabilityChange: null, enabledFrom: null };
}
