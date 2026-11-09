import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

// US-34 (§3.2.3): un validador por campo, para que cada caso dé un único mensaje (con varios
// decoradores, un valor vacío devolvería todos los mensajes juntos). Los textos son los del
// contrato, salvo los marcados.
export const REWARD_FIELD_MESSAGES = {
  required: 'Completá este campo.',
  nameMax: 'Máximo 80 caracteres.',
  descriptionMax: 'Máximo 255 caracteres.',
  positiveInteger: 'Ingresá un número entero mayor a 0.',
  pointsMax: 'El máximo es 1.000.000 puntos.',
  stockNotInteger: 'Ingresá un número entero, sin decimales.',
  stockMax: 'El máximo es 100.000.',
  // El contrato no cita texto (decisión de Jazmín: el mismo que los filtros por fecha)
  invalidDate: 'expiresAt no es una fecha válida (YYYY-MM-DD)',
} as const;

export const REWARD_NAME_MAX = 80;
export const REWARD_DESCRIPTION_MAX = 255;
export const REWARD_POINTS_MAX = 1_000_000;
export const REWARD_STOCK_MAX = 100_000;

type MessageFor = (value: unknown) => string | null;

const isMissing = (value: unknown): boolean => value === undefined || value === null;

// El nombre ya llega recortado (@Transform en el DTO). Si no es texto, se trata como vacío
// (decisión de Jazmín: el contrato no cita texto para ese caso).
const nameMessage: MessageFor = (value) => {
  if (typeof value !== 'string' || value === '') return REWARD_FIELD_MESSAGES.required;
  if (value.length > REWARD_NAME_MAX) return REWARD_FIELD_MESSAGES.nameMax;
  return null;
};

// Opcional: ausente o null valen (se guarda null). Llega recortada.
const descriptionMessage: MessageFor = (value) => {
  if (isMissing(value)) return null;
  if (typeof value !== 'string' || value.length > REWARD_DESCRIPTION_MAX) return REWARD_FIELD_MESSAGES.descriptionMax;
  return null;
};

// Decimales, texto, 0 o negativo: el contrato da un solo mensaje (decisión de Jazmín: "como lo
// ponga el contrato"). "10" como texto no vale: tiene que llegar como número JSON.
const pointsMessage: MessageFor = (value) => {
  if (isMissing(value) || value === '') return REWARD_FIELD_MESSAGES.required;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return REWARD_FIELD_MESSAGES.positiveInteger;
  }
  if (value > REWARD_POINTS_MAX) return REWARD_FIELD_MESSAGES.pointsMax;
  return null;
};

// Tiene que venir; null = sin límite. Al crear, de 1 a 100.000.
const stockMessage: MessageFor = (value) => {
  if (value === undefined) return REWARD_FIELD_MESSAGES.required;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) return REWARD_FIELD_MESSAGES.stockNotInteger;
  if (value <= 0) return REWARD_FIELD_MESSAGES.positiveInteger;
  if (value > REWARD_STOCK_MAX) return REWARD_FIELD_MESSAGES.stockMax;
  return null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// YYYY-MM-DD de un día que existe ("2026-02-30" no vale)
function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Tiene que venir; null = no vence. Que no sea anterior a hoy lo valida el dominio.
const expiresAtMessage: MessageFor = (value) => {
  if (value === undefined) return REWARD_FIELD_MESSAGES.required;
  if (value === null) return null;
  if (typeof value !== 'string' || !isCalendarDate(value)) return REWARD_FIELD_MESSAGES.invalidDate;
  return null;
};

// Nest instancia cada constraint con `new`, sin argumentos: cada campo tiene su clase
abstract class SingleMessageValidator implements ValidatorConstraintInterface {
  protected abstract readonly messageFor: MessageFor;

  validate(value: unknown): boolean {
    return this.messageFor(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.messageFor(args.value) ?? REWARD_FIELD_MESSAGES.required;
  }
}

@ValidatorConstraint({ name: 'rewardName', async: false })
export class RewardNameValidator extends SingleMessageValidator {
  protected readonly messageFor = nameMessage;
}

@ValidatorConstraint({ name: 'rewardDescription', async: false })
export class RewardDescriptionValidator extends SingleMessageValidator {
  protected readonly messageFor = descriptionMessage;
}

@ValidatorConstraint({ name: 'rewardPoints', async: false })
export class RewardPointsValidator extends SingleMessageValidator {
  protected readonly messageFor = pointsMessage;
}

@ValidatorConstraint({ name: 'rewardStock', async: false })
export class RewardStockValidator extends SingleMessageValidator {
  protected readonly messageFor = stockMessage;
}

@ValidatorConstraint({ name: 'rewardExpiresAt', async: false })
export class RewardExpiresAtValidator extends SingleMessageValidator {
  protected readonly messageFor = expiresAtMessage;
}
