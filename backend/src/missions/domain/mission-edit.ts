import { DomainError } from './errors/domain.error.js';
import {
  objectiveOf,
  sameObjective,
  shiftMonth,
  type Mission,
  type MissionObjective,
  type MissionObjectiveType,
  type MissionPendingChanges,
} from './mission.js';
import { monthRangeRuleMessage, targetRuleMessage, timeRangeRuleMessage } from './mission-rules.js';
import { PAST_START_MONTH_MESSAGE } from './new-mission.js';

// US-29 (contrato S5 §3.1.4 y S5-20): qué cambia al editar una misión y cuándo rige. Función pura:
// el servicio bloquea la misión, averigua si tiene clientes este mes, guarda `next` y audita con
// `auditBefore` / `auditAfter`.

// Lo que llega en el PATCH. undefined = no vino (no se toca); null = vaciarlo, donde se puede.
export type MissionEditInput = {
  name?: string;
  description?: string | null;
  objectiveType?: MissionObjectiveType;
  target?: number;
  daysOfWeek?: number[] | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  rewardPoints?: number | null;
  startMonth?: string;
  endMonth?: string | null;
};

export type MissionEditContext = {
  // YYYY-MM, hora de Argentina
  currentMonth: string;
  // La misión tiene al menos una asignación con period = mes actual, en cualquier estado
  // (decisión de Jazmín)
  hasAssignmentsThisMonth: boolean;
};

// Lo que se guarda: el objetivo vigente y, si corresponde, el que rige desde el mes siguiente
export type MissionEditableState = MissionObjective & {
  name: string;
  description: string | null;
  startMonth: string;
  endMonth: string | null;
  pendingChanges: MissionPendingChanges | null;
};

// Lo que se compara para MISSION_UPDATED: el objetivo es el que iba a regir (el pendiente, si había)
export type MissionEditAuditState = MissionObjective & {
  name: string;
  description: string | null;
  startMonth: string;
  endMonth: string | null;
};

export type MissionEditPlan = {
  next: MissionEditableState;
  // YYYY-MM si esta edición dejó el objetivo para el mes siguiente; null si todo rigió en el momento
  appliesFrom: string | null;
  // false = no cambió nada: no se guarda ni se audita (decisión de Jazmín, igual que Recompensas)
  changed: boolean;
  auditBefore: MissionEditAuditState;
  auditAfter: MissionEditAuditState;
};

export const EMPTY_EDIT_MESSAGE = 'Modificá al menos un dato.';
export const STARTED_MISSION_MESSAGE = 'La misión ya empezó: no se puede cambiar el mes de inicio.';
// No citado (decisión de Jazmín: el mes de fin no puede ser anterior al actual)
export const PAST_END_MONTH_MESSAGE = 'El mes de fin no puede ser anterior al mes actual.';

const sortDays = (days: number[] | null): number[] | null => (days ? [...days].sort((a, b) => a - b) : null);
const pick = <T>(value: T | undefined, fallback: T): T => (value === undefined ? fallback : value);

export function isEmptyEdit(input: MissionEditInput): boolean {
  return Object.values(input).every((value) => value === undefined);
}

export function planMissionEdit(current: Mission, input: MissionEditInput, context: MissionEditContext): MissionEditPlan {
  const live = objectiveOf(current);
  // Si ya había una edición pendiente, esta se combina con ella (decisión de Jazmín)
  const base = current.pendingChanges ? objectiveOf(current.pendingChanges) : live;
  const merged: MissionObjective = {
    objectiveType: pick(input.objectiveType, base.objectiveType),
    target: pick(input.target, base.target),
    daysOfWeek: input.daysOfWeek === undefined ? base.daysOfWeek : sortDays(input.daysOfWeek),
    timeFrom: pick(input.timeFrom, base.timeFrom),
    timeTo: pick(input.timeTo, base.timeTo),
    rewardPoints: pick(input.rewardPoints, base.rewardPoints),
  };

  // Las reglas entre campos, con los valores combinados (lo que llega y lo que ya tiene)
  const targetError = targetRuleMessage(merged.objectiveType, merged.target);
  if (targetError) throw new DomainError(targetError, 'target');
  const timeError = timeRangeRuleMessage(merged.timeFrom, merged.timeTo);
  if (timeError) throw new DomainError(timeError, merged.timeFrom === null ? 'timeFrom' : 'timeTo');

  const startMonth = pick(input.startMonth, current.startMonth);
  if (startMonth !== current.startMonth) {
    if (current.startMonth <= context.currentMonth) throw new DomainError(STARTED_MISSION_MESSAGE, 'startMonth');
    if (startMonth < context.currentMonth) throw new DomainError(PAST_START_MONTH_MESSAGE, 'startMonth');
  }

  const endMonth = pick(input.endMonth, current.endMonth);
  if (endMonth !== null && endMonth !== current.endMonth && endMonth < context.currentMonth) {
    throw new DomainError(PAST_END_MONTH_MESSAGE, 'endMonth');
  }
  const monthError = monthRangeRuleMessage(startMonth, endMonth);
  if (monthError) throw new DomainError(monthError, 'endMonth');

  const description = input.description === undefined ? current.description : (input.description?.trim() ?? '') || null;
  const name = input.name === undefined ? current.name : input.name.trim();

  // S5-20: sin clientes este mes, el objetivo cambia ya; con clientes, rige desde el mes siguiente y el
  // mes actual sigue con el snapshot de cada asignación. Si queda igual al vigente, no hay pendiente.
  let liveObjective = merged;
  let pendingChanges: MissionPendingChanges | null = null;
  if (context.hasAssignmentsThisMonth) {
    liveObjective = live;
    if (!sameObjective(merged, live)) {
      pendingChanges = { appliesFrom: shiftMonth(context.currentMonth, 1), ...merged };
    }
  }
  const objectiveChanged = !sameObjective(merged, base);
  const appliesFrom = objectiveChanged && pendingChanges ? pendingChanges.appliesFrom : null;

  const pendingChanged =
    (current.pendingChanges === null) !== (pendingChanges === null) ||
    (current.pendingChanges !== null &&
      pendingChanges !== null &&
      (!sameObjective(current.pendingChanges, pendingChanges) ||
        current.pendingChanges.appliesFrom !== pendingChanges.appliesFrom));

  const changed =
    name !== current.name ||
    description !== current.description ||
    startMonth !== current.startMonth ||
    endMonth !== current.endMonth ||
    !sameObjective(liveObjective, live) ||
    pendingChanged;

  return {
    next: { ...liveObjective, name, description, startMonth, endMonth, pendingChanges },
    appliesFrom,
    changed,
    auditBefore: {
      ...base,
      name: current.name,
      description: current.description,
      startMonth: current.startMonth,
      endMonth: current.endMonth,
    },
    auditAfter: { ...merged, name, description, startMonth, endMonth },
  };
}
