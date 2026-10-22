import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength } from 'class-validator';

// §3.1.3. La fecha, los puntos, el cajero responsable y la equivalencia NO van en el body:
// si llegan, el ValidationPipe global (whitelist + forbidNonWhitelisted) los rechaza con
// 400 "property X should not exist" porque no están declarados acá (CA-21.6).
export class CreateConsumptionDto {
  @IsInt()
  @IsPositive()
  customerId!: number;

  // Mismo criterio que SetPointsEquivalenceDto (loyalty): > 0, hasta 2 decimales, tope de
  // la columna DECIMAL(12,2).
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(9_999_999_999.99)
  amount!: number;

  // Observaciones (opcional, decisión #6). Ausente o vacío se guarda como null — esa parte
  // la decide el dominio (Consumption), acá solo se valida el tipo y el largo.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}
