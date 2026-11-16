import { Transform } from 'class-transformer';
import { Validate } from 'class-validator';
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
  MissionTimeToValidator,
} from '../validators/mission-fields.validators.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// US-28 (§3.1.3). El estado, el id y las fechas los pone el servidor; phase, completedCount y
// pendingChanges los calcula. Si llegan, el ValidationPipe global (whitelist +
// forbidNonWhitelisted) responde 400 "property X should not exist" (CA-28.7).
export class CreateMissionDto {
  // Se recorta antes de validar: "   " cuenta como vacío
  @Transform(trim)
  @Validate(MissionNameValidator)
  name!: string;

  @Transform(trim)
  @Validate(MissionDescriptionValidator)
  description?: string | null;

  @Validate(MissionObjectiveTypeValidator)
  objectiveType!: MissionObjectiveType;

  @Validate(MissionTargetValidator)
  target!: number;

  // Ausente o null = todos los días
  @Validate(MissionDaysOfWeekValidator)
  daysOfWeek?: number[] | null;

  // HH:mm. Los dos o ninguno (lo controla timeTo)
  @Validate(MissionTimeFormatValidator)
  timeFrom?: string | null;

  @Validate(MissionTimeToValidator)
  timeTo?: string | null;

  // Ausente o null = sin recompensa
  @Validate(MissionRewardPointsValidator)
  rewardPoints?: number | null;

  // YYYY-MM
  @Validate(MissionStartMonthValidator)
  startMonth!: string;

  // YYYY-MM. Ausente o null = se repite todos los meses
  @Validate(MissionEndMonthValidator)
  endMonth?: string | null;
}
