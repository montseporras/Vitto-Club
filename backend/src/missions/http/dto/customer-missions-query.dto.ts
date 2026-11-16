import { IsOptional, IsString } from 'class-validator';

// GET /customers/me/misiones y GET /customers/:id/misiones (§3.3.2 y §3.3.4). El formato y el rango del
// mes los controla el dominio, con el mensaje del contrato ("Elegí un mes de los últimos 12."). Otro
// query param → 400.
export class CustomerMissionsQueryDto {
  @IsOptional()
  @IsString()
  period?: string;
}
