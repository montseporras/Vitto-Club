import { Transform } from 'class-transformer';
import { Validate, ValidateIf } from 'class-validator';
import type { MissionObjectiveType } from '../../domain/mission.js';
import {
  MissionDaysOfWeekValidator,
  MissionDescriptionValidator,
  MissionEndMonthValidator,
  MissionNameValidator,
  MissionObjectiveTypeValidator,
  MissionRewardPointsValidator,
  MissionStartMonthValidator,
  MissionTargetValidator,
  MissionTimeFormatValidator,
} from '../validators/mission-fields.validators.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Solo se valida lo que viene: un campo ausente no se toca
const ifPresent = ValidateIf((_dto: object, value: unknown) => value !== undefined);

// US-29 (§3.1.4): los mismos campos y mensajes del alta, todos opcionales. Que venga al menos uno lo
// valida el servicio ("Modificá al menos un dato."). Las reglas entre campos (máximo según el tipo,
// la franja horaria, el orden de los meses) las controla el dominio con los valores combinados: lo
// que llega y lo que ya tiene la misión. El estado, el id y las fechas no se editan: si llegan, el
// ValidationPipe global responde 400 "property X should not exist".
export class UpdateMissionDto {
  // Si viene, no puede ser vacío ni null
  @Transform(trim)
  @ifPresent
  @Validate(MissionNameValidator)
  name?: string;

  // null o vacío = sin descripción
  @Transform(trim)
  @ifPresent
  @Validate(MissionDescriptionValidator)
  description?: string | null;

  @ifPresent
  @Validate(MissionObjectiveTypeValidator)
  objectiveType?: MissionObjectiveType;

  @ifPresent
  @Validate(MissionTargetValidator)
  target?: number;

  // null = todos los días
  @ifPresent
  @Validate(MissionDaysOfWeekValidator)
  daysOfWeek?: number[] | null;

  // HH:mm o null (sin horario: hay que mandar las dos en null)
  @ifPresent
  @Validate(MissionTimeFormatValidator)
  timeFrom?: string | null;

  @ifPresent
  @Validate(MissionTimeFormatValidator)
  timeTo?: string | null;

  // null = sin recompensa
  @ifPresent
  @Validate(MissionRewardPointsValidator)
  rewardPoints?: number | null;

  // Si viene, no puede ser null
  @ifPresent
  @Validate(MissionStartMonthValidator)
  startMonth?: string;

  // null = se repite todos los meses
  @ifPresent
  @Validate(MissionEndMonthValidator)
  endMonth?: string | null;
}
