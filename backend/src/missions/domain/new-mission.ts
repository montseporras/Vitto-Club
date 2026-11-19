import { DomainError } from './errors/domain.error.js';
import type { MissionObjectiveType } from './mission.js';

// US-28 (contrato S5 §3.1.3): los datos de una misión nueva. Los tipos, los largos, los rangos y
// las reglas entre campos que no dependen de la fecha los valida el DTO con los mensajes del
// contrato; acá queda la regla que depende del mes actual y la normalización.
export type NewMissionInput = {
  name: string;
  description?: string | null;
  objectiveType: MissionObjectiveType;
  target: number;
  daysOfWeek?: number[] | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  rewardPoints?: number | null;
  startMonth: string;
  endMonth?: string | null;
};

export type NewMission = {
  name: string;
  description: string | null;
  objectiveType: MissionObjectiveType;
  target: number;
  daysOfWeek: number[] | null;
  timeFrom: string | null;
  timeTo: string | null;
  rewardPoints: number | null;
  startMonth: string;
  endMonth: string | null;
};

export const PAST_START_MONTH_MESSAGE = 'El mes de inicio no puede ser anterior al mes actual.';

// `currentMonth` en YYYY-MM, hora de Argentina. Nace ACTIVE (lo pone la base por defecto). El
// nombre y la descripción se recortan; una descripción vacía se guarda como null. Los días quedan
// ordenados de lunes a domingo (decisión de Jazmín). Lo que no vino es null: sin condición de días
// ni de horario, sin recompensa y sin mes de fin.
export function buildNewMission(input: NewMissionInput, currentMonth: string): NewMission {
  if (input.startMonth < currentMonth) {
    throw new DomainError(PAST_START_MONTH_MESSAGE, 'startMonth');
  }

  const description = input.description?.trim() ?? '';
  return {
    name: input.name.trim(),
    description: description === '' ? null : description,
    objectiveType: input.objectiveType,
    target: input.target,
    daysOfWeek: input.daysOfWeek ? [...input.daysOfWeek].sort((a, b) => a - b) : null,
    timeFrom: input.timeFrom ?? null,
    timeTo: input.timeTo ?? null,
    rewardPoints: input.rewardPoints ?? null,
    startMonth: input.startMonth,
    endMonth: input.endMonth ?? null,
  };
}
