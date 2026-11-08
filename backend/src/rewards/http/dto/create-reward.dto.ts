import { Transform } from 'class-transformer';
import { Validate } from 'class-validator';
import {
  RewardDescriptionValidator,
  RewardExpiresAtValidator,
  RewardNameValidator,
  RewardPointsValidator,
  RewardStockValidator,
} from '../validators/reward-fields.validators.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// US-34 (§3.2.3). El estado, usedCount, el id, las fechas y la foto (Sprint 5) los pone el
// servidor: si llegan, el ValidationPipe global (whitelist + forbidNonWhitelisted) responde 400
// "property X should not exist" (CA-34.7).
export class CreateRewardDto {
  // Se recorta antes de validar: "   " cuenta como vacío
  @Transform(trim)
  @Validate(RewardNameValidator)
  name!: string;

  @Transform(trim)
  @Validate(RewardDescriptionValidator)
  description?: string | null;

  @Validate(RewardPointsValidator)
  points!: number;

  // null = sin límite, pero tiene que venir
  @Validate(RewardStockValidator)
  stock!: number | null;

  // YYYY-MM-DD o null (no vence), pero tiene que venir
  @Validate(RewardExpiresAtValidator)
  expiresAt!: string | null;
}
