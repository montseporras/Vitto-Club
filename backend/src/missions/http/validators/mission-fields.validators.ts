import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { MISSION_OBJECTIVE_TYPES, type MissionObjectiveType } from '../../domain/mission.js';

// US-28 (§3.1.3): un validador por campo, para que cada caso dé un único mensaje (con varios
// decoradores, un valor vacío devolvería todos los mensajes juntos), igual que en rewards. Los
// textos son los del contrato, salvo los marcados (decisión de Jazmín: el contrato no los cita).
export const MISSION_FIELD_MESSAGES = {
  // No citado: el mismo que Recompensas
  required: 'Completá este campo.',
  nameRequired: 'El nombre es obligatorio.',
  nameMax: 'El nombre no puede superar los 80 caracteres.',
  descriptionMax: 'La descripción no puede superar los 255 caracteres.',
  // No citado
  objectiveTypeInvalid: 'Elegí un tipo de objetivo válido.',
  targetPositive: 'Ingresá un objetivo mayor a 0.',
  targetInteger: 'Ingresá un número entero.',
  // No citado
  targetDecimals: 'Ingresá un monto con hasta 2 decimales.',
  rewardPointsPositive: 'Ingresá puntos enteros mayores a 0.',
  rewardPointsMax: 'El máximo es 100.000 puntos.',
  daysEmpty: 'Elegí al menos un día o marcá «Todos los días».',
  // No citado
  daysInvalid: 'Los días tienen que ser de 1 (lunes) a 7 (domingo), sin repetir.',
  // No citado
  timeInvalid: 'Ingresá la hora en formato HH:mm.',
  timeBothOrNone: 'Completá las dos horas o ninguna.',
  timeOrder: 'La hora de inicio tiene que ser anterior a la de fin.',
  // No citado
  monthInvalid: 'Ingresá el mes en formato AAAA-MM.',
  endMonthBeforeStart: 'El mes de fin no puede ser anterior al de inicio.',
} as const;

export const MISSION_NAME_MAX = 80;
export const MISSION_DESCRIPTION_MAX = 255;
export const MISSION_REWARD_POINTS_MAX = 100_000;

// §2.3: el máximo del objetivo depende de lo que mide
export const MISSION_TARGET_MAX: Record<MissionObjectiveType, number> = {
  CONSUMPTION_COUNT: 100,
  CONSUMPTION_AMOUNT: 1_000_000,
};

// "El objetivo máximo es {máx}.", con punto de miles (decisión de Jazmín)
export const targetMaxMessage = (max: number): string => `El objetivo máximo es ${max.toLocaleString('es-AR')}.`;

type MessageFor = (value: unknown, object: Record<string, unknown>) => string | null;

const isMissing = (value: unknown): boolean => value === undefined || value === null;
const isObjectiveType = (value: unknown): value is MissionObjectiveType =>
  typeof value === 'string' && (MISSION_OBJECTIVE_TYPES as readonly string[]).includes(value);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const isTime = (value: unknown): value is string => typeof value === 'string' && TIME_PATTERN.test(value);
const isMonth = (value: unknown): value is string => typeof value === 'string' && MONTH_PATTERN.test(value);

// El nombre ya llega recortado (@Transform en el DTO). Si no es texto, se trata como vacío.
const nameMessage: MessageFor = (value) => {
  if (typeof value !== 'string' || value === '') return MISSION_FIELD_MESSAGES.nameRequired;
  if (value.length > MISSION_NAME_MAX) return MISSION_FIELD_MESSAGES.nameMax;
  return null;
};

// Opcional: ausente o null valen (se guarda null). Llega recortada.
const descriptionMessage: MessageFor = (value) => {
  if (isMissing(value)) return null;
  if (typeof value !== 'string' || value.length > MISSION_DESCRIPTION_MAX) return MISSION_FIELD_MESSAGES.descriptionMax;
  return null;
};

const objectiveTypeMessage: MessageFor = (value) => {
  if (isMissing(value) || value === '') return MISSION_FIELD_MESSAGES.required;
  if (!isObjectiveType(value)) return MISSION_FIELD_MESSAGES.objectiveTypeInvalid;
  return null;
};

// Tiene que llegar como número JSON. El entero, los decimales y el máximo dependen de
// objectiveType; si el tipo no es válido, solo se controla que sea mayor a 0 (el tipo ya da su
// propio mensaje).
const targetMessage: MessageFor = (value, object) => {
  if (isMissing(value) || value === '') return MISSION_FIELD_MESSAGES.required;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return MISSION_FIELD_MESSAGES.targetPositive;

  const type = object.objectiveType;
  if (!isObjectiveType(type)) return null;
  if (type === 'CONSUMPTION_COUNT' && !Number.isInteger(value)) return MISSION_FIELD_MESSAGES.targetInteger;
  // Con tolerancia: 0.29 * 100 da 28.999999999999996 en coma flotante
  if (type === 'CONSUMPTION_AMOUNT' && Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    return MISSION_FIELD_MESSAGES.targetDecimals;
  }
  if (value > MISSION_TARGET_MAX[type]) return targetMaxMessage(MISSION_TARGET_MAX[type]);
  return null;
};

// Opcional: ausente o null = sin recompensa (RF-031)
const rewardPointsMessage: MessageFor = (value) => {
  if (isMissing(value)) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return MISSION_FIELD_MESSAGES.rewardPointsPositive;
  }
  if (value > MISSION_REWARD_POINTS_MAX) return MISSION_FIELD_MESSAGES.rewardPointsMax;
  return null;
};

// Opcional: ausente o null = todos los días. Vacío no vale.
const daysOfWeekMessage: MessageFor = (value) => {
  if (isMissing(value)) return null;
  if (!Array.isArray(value)) return MISSION_FIELD_MESSAGES.daysInvalid;
  if (value.length === 0) return MISSION_FIELD_MESSAGES.daysEmpty;
  const valid = value.every((day) => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7);
  if (!valid || new Set(value).size !== value.length) return MISSION_FIELD_MESSAGES.daysInvalid;
  return null;
};

// Cada hora, por su formato
const timeFormatMessage: MessageFor = (value) => {
  if (isMissing(value)) return null;
  return isTime(value) ? null : MISSION_FIELD_MESSAGES.timeInvalid;
};

// timeTo además controla la franja: las dos o ninguna, y desde < hasta. Va en un solo campo para
// que el mensaje no salga dos veces.
const timeToMessage: MessageFor = (value, object) => {
  const format = timeFormatMessage(value, object);
  if (format) return format;
  const from = object.timeFrom;
  if (isMissing(from) !== isMissing(value)) return MISSION_FIELD_MESSAGES.timeBothOrNone;
  // HH:mm: el orden de los textos es el de las horas
  if (isTime(from) && isTime(value) && from >= value) return MISSION_FIELD_MESSAGES.timeOrder;
  return null;
};

// Que no sea anterior al mes actual lo valida el dominio (depende de la fecha)
const startMonthMessage: MessageFor = (value) => {
  if (isMissing(value) || value === '') return MISSION_FIELD_MESSAGES.required;
  return isMonth(value) ? null : MISSION_FIELD_MESSAGES.monthInvalid;
};

// Opcional: ausente o null = se repite todos los meses (S5-19)
const endMonthMessage: MessageFor = (value, object) => {
  if (isMissing(value)) return null;
  if (!isMonth(value)) return MISSION_FIELD_MESSAGES.monthInvalid;
  const start = object.startMonth;
  if (isMonth(start) && value < start) return MISSION_FIELD_MESSAGES.endMonthBeforeStart;
  return null;
};

// Nest instancia cada constraint con `new`, sin argumentos: cada campo tiene su clase
abstract class SingleMessageValidator implements ValidatorConstraintInterface {
  protected abstract readonly messageFor: MessageFor;

  validate(value: unknown, args: ValidationArguments): boolean {
    return this.messageFor(value, args.object as Record<string, unknown>) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.messageFor(args.value, args.object as Record<string, unknown>) ?? MISSION_FIELD_MESSAGES.required;
  }
}

@ValidatorConstraint({ name: 'missionName', async: false })
export class MissionNameValidator extends SingleMessageValidator {
  protected readonly messageFor = nameMessage;
}

@ValidatorConstraint({ name: 'missionDescription', async: false })
export class MissionDescriptionValidator extends SingleMessageValidator {
  protected readonly messageFor = descriptionMessage;
}

@ValidatorConstraint({ name: 'missionObjectiveType', async: false })
export class MissionObjectiveTypeValidator extends SingleMessageValidator {
  protected readonly messageFor = objectiveTypeMessage;
}

@ValidatorConstraint({ name: 'missionTarget', async: false })
export class MissionTargetValidator extends SingleMessageValidator {
  protected readonly messageFor = targetMessage;
}

@ValidatorConstraint({ name: 'missionRewardPoints', async: false })
export class MissionRewardPointsValidator extends SingleMessageValidator {
  protected readonly messageFor = rewardPointsMessage;
}

@ValidatorConstraint({ name: 'missionDaysOfWeek', async: false })
export class MissionDaysOfWeekValidator extends SingleMessageValidator {
  protected readonly messageFor = daysOfWeekMessage;
}

@ValidatorConstraint({ name: 'missionTimeFrom', async: false })
export class MissionTimeFromValidator extends SingleMessageValidator {
  protected readonly messageFor = timeFormatMessage;
}

@ValidatorConstraint({ name: 'missionTimeTo', async: false })
export class MissionTimeToValidator extends SingleMessageValidator {
  protected readonly messageFor = timeToMessage;
}

@ValidatorConstraint({ name: 'missionStartMonth', async: false })
export class MissionStartMonthValidator extends SingleMessageValidator {
  protected readonly messageFor = startMonthMessage;
}

@ValidatorConstraint({ name: 'missionEndMonth', async: false })
export class MissionEndMonthValidator extends SingleMessageValidator {
  protected readonly messageFor = endMonthMessage;
}
