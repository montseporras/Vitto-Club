import { objectiveOf, type Mission, type MissionObjective, type MissionObjectiveType } from './mission.js';

// US-30 (contrato S5 §3.2 y S5-21): reglas puras del avance de una misión por un consumo.

export type MissionCondition = Pick<MissionObjective, 'daysOfWeek' | 'timeFrom' | 'timeTo'>;

// El snapshot que copia la asignación al nacer (S5-20). Si la misión tiene una edición pendiente que
// ya rige en ese mes (appliesFrom <= mes), se toma la pendiente, aunque el proceso de fin de mes (US-32)
// todavía no la haya aplicado (decisión de Jazmín).
export function snapshotForMonth(mission: Mission, month: string): MissionObjective {
  const pending = mission.pendingChanges;
  return pending && pending.appliesFrom <= month ? objectiveOf(pending) : objectiveOf(mission);
}

// Días y franja del momento del consumo, en hora de Argentina. La franja es [desde, hasta): "de 09:00 a
// 13:00" cuenta las 09:00 y no las 13:00 (decisión de Jazmín). `time` en HH:mm: el orden de los textos
// es el de las horas.
export function meetsCondition(condition: MissionCondition, weekday: number, time: string): boolean {
  if (condition.daysOfWeek !== null && condition.daysOfWeek.length > 0 && !condition.daysOfWeek.includes(weekday)) {
    return false;
  }
  if (condition.timeFrom !== null && condition.timeTo !== null) {
    return time >= condition.timeFrom && time < condition.timeTo;
  }
  return true;
}

// +1 por consumo o + el monto
export const incrementFor = (objectiveType: MissionObjectiveType, amount: number): number =>
  objectiveType === 'CONSUMPTION_COUNT' ? 1 : amount;

// Montos con 2 decimales, como la columna decimal(12,2)
const round2 = (value: number): number => Math.round(value * 100) / 100;

// El progreso nunca pasa el objetivo. Completa al llegar.
export function advanceProgress(progress: number, target: number, increment: number): { progress: number; completed: boolean } {
  const next = Math.min(target, round2(progress + increment));
  return { progress: next, completed: next >= target };
}

// Anular (S5-21): resta lo que el consumo sumó, sin bajar de 0
export const revertProgress = (progress: number, increment: number): number => Math.max(0, round2(progress - increment));
