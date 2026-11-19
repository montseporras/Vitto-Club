import type { MissionObjectiveType } from './mission.js';

// Reglas de §3.1.3 que dependen de más de un campo. Las usa el DTO del alta (con los valores del body)
// y la edición de US-29 (con los valores combinados: lo que llega y lo que ya tiene la misión).
export const MISSION_RULE_MESSAGES = {
  targetInteger: 'Ingresá un número entero.',
  // No citado (decisión de Jazmín)
  targetDecimals: 'Ingresá un monto con hasta 2 decimales.',
  timeBothOrNone: 'Completá las dos horas o ninguna.',
  timeOrder: 'La hora de inicio tiene que ser anterior a la de fin.',
  endMonthBeforeStart: 'El mes de fin no puede ser anterior al de inicio.',
} as const;

// §2.3: el máximo del objetivo depende de lo que mide
export const MISSION_TARGET_MAX: Record<MissionObjectiveType, number> = {
  CONSUMPTION_COUNT: 100,
  CONSUMPTION_AMOUNT: 1_000_000,
};

// "El objetivo máximo es {máx}.", con punto de miles (decisión de Jazmín)
export const targetMaxMessage = (max: number): string => `El objetivo máximo es ${max.toLocaleString('es-AR')}.`;

// Para un objetivo que ya es un número mayor a 0: entero si cuenta consumos, hasta 2 decimales si
// suma montos, y el máximo de cada tipo. null si está bien.
export function targetRuleMessage(type: MissionObjectiveType, target: number): string | null {
  if (type === 'CONSUMPTION_COUNT' && !Number.isInteger(target)) return MISSION_RULE_MESSAGES.targetInteger;
  // Con tolerancia: 0.29 * 100 da 28.999999999999996 en coma flotante
  if (type === 'CONSUMPTION_AMOUNT' && Math.abs(target * 100 - Math.round(target * 100)) > 1e-6) {
    return MISSION_RULE_MESSAGES.targetDecimals;
  }
  if (target > MISSION_TARGET_MAX[type]) return targetMaxMessage(MISSION_TARGET_MAX[type]);
  return null;
}

// Para dos horas HH:mm (o null): las dos o ninguna, y desde < hasta. El orden de los textos HH:mm es el
// de las horas. null si está bien.
export function timeRangeRuleMessage(timeFrom: string | null, timeTo: string | null): string | null {
  if ((timeFrom === null) !== (timeTo === null)) return MISSION_RULE_MESSAGES.timeBothOrNone;
  if (timeFrom !== null && timeTo !== null && timeFrom >= timeTo) return MISSION_RULE_MESSAGES.timeOrder;
  return null;
}

// Meses YYYY-MM: el orden de los textos es el de los meses. null si está bien.
export function monthRangeRuleMessage(startMonth: string, endMonth: string | null): string | null {
  return endMonth !== null && endMonth < startMonth ? MISSION_RULE_MESSAGES.endMonthBeforeStart : null;
}
