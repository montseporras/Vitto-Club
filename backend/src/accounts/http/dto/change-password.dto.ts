import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// PATCH /mi-cuenta/password (contrato §3.11.1). Solo se validan acá los tipos y el largo máximo de la
// actual. La política de la nueva se aplica en el servicio, DESPUÉS de verificar la actual: si
// estuviera acá, una nueva inválida taparía el CURRENT_PASSWORD_INCORRECT (orden pedido por Magali).
// La confirmación de la nueva contraseña la valida solo el frontend: no viaja.
export class ChangePasswordDto {
  @IsString({ message: 'Este campo es obligatorio' })
  @IsNotEmpty({ message: 'Este campo es obligatorio' })
  @MaxLength(64, { message: 'La contraseña actual es incorrecta' })
  currentPassword!: string;

  @IsString({ message: 'Este campo es obligatorio' })
  newPassword!: string;
}
