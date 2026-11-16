import { IsOptional, IsString } from 'class-validator';

// GET /misiones/:id/completadas (§3.1.7). El formato y el rango del mes los controla el dominio, con el
// mensaje del contrato ("Elegí un mes de los últimos 12."). Otro query param → 400.
export class CompletedQueryDto {
  @IsOptional()
  @IsString()
  period?: string;
}
