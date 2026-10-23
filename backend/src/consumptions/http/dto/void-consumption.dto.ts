import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

// §3.2.2, CA-22.8. El motivo es obligatorio, de 5 a 500 caracteres, sin espacios en los
// extremos: se recorta antes de validar el largo, así " ab " no cuenta como 4 caracteres.
export class VoidConsumptionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'El motivo de anulación es obligatorio.' })
  @Length(5, 500, { message: 'Indicá un motivo de al menos 5 caracteres.' })
  reason!: string;
}
