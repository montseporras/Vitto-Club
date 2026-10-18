import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Max } from 'class-validator';

// §3.1.2. Los dos son obligatorios: sin customerId o amount, el ValidationPipe global
// responde 400 por su cuenta.
export class PreviewConsumptionQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9_999_999_999.99)
  amount!: number;
}
