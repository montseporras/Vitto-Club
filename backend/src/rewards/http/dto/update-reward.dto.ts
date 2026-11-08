import { Transform } from 'class-transformer';
import { Validate, ValidateIf } from 'class-validator';
import {
  RewardDescriptionValidator,
  RewardEditStockValidator,
  RewardExpiresAtValidator,
  RewardNameValidator,
  RewardPointsValidator,
} from '../validators/reward-fields.validators.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Solo se valida lo que viene: un campo ausente no se toca
const ifPresent = ValidateIf((_dto: object, value: unknown) => value !== undefined);

// US-35 (§3.2.4): los mismos campos del alta, todos opcionales. Que venga al menos uno lo valida el
// servicio ("Indicá al menos un campo para modificar."). El estado no se edita acá (US-36): si llega,
// como cualquier campo de más, el ValidationPipe global responde 400 "property X should not exist".
export class UpdateRewardDto {
  // Si viene, no puede ser vacío ni null
  @Transform(trim)
  @ifPresent
  @Validate(RewardNameValidator)
  name?: string;

  // null o vacío = sin descripción
  @Transform(trim)
  @ifPresent
  @Validate(RewardDescriptionValidator)
  description?: string | null;

  @ifPresent
  @Validate(RewardPointsValidator)
  points?: number;

  // 0 a 100.000 o null (sin límite)
  @ifPresent
  @Validate(RewardEditStockValidator)
  stock?: number | null;

  // YYYY-MM-DD o null (no vence). Que no sea anterior a hoy lo valida el dominio, siempre que venga.
  @ifPresent
  @Validate(RewardExpiresAtValidator)
  expiresAt?: string | null;
}
