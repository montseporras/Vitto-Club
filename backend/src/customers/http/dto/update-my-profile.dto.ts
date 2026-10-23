import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

// Solo se validan los campos que vienen en el body (un `null` en el correo se rechaza con 400)
const isProvided = (_object: unknown, value: unknown) => value !== undefined;

// PATCH /customers/me (contrato §3.10.4). Se envía solo lo que cambia. firstName, lastName,
// documentType y documentNumber no están: el ValidationPipe global (forbidNonWhitelisted) los
// rechaza con 400 "property X should not exist". Los mensajes son los del contrato.
// El teléfono y la fecha se validan en CustomersService.updateOwnProfile, con las reglas del dominio.
export class UpdateMyProfileDto {
  // Sin espacios en los extremos: "el mismo correo con otras mayúsculas o espacios" no es un cambio (§3.10.4)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(isProvided)
  @IsNotEmpty({ message: 'Este campo es obligatorio' })
  @IsEmail({}, { message: 'Ingresá un correo válido, por ejemplo nombre@mail.com' })
  @MaxLength(150, { message: 'Ingresá un correo válido, por ejemplo nombre@mail.com' })
  email?: string;

  // Opcional: null o vacío lo borra
  @IsOptional()
  @IsString({ message: 'El teléfono tiene que tener entre 8 y 15 números' })
  @MaxLength(30, { message: 'El teléfono tiene que tener entre 8 y 15 números' })
  phone?: string | null;

  // Formato YYYY-MM-DD; null la borra. Que no sea futura y que el año sea >= 1900 lo controla el servicio.
  @IsOptional()
  @IsString({ message: 'Esa fecha no existe' })
  dateOfBirth?: string | null;

  // Obligatoria solo si cambia el correo (lo controla el servicio, que conoce el correo actual). Si el
  // correo no cambia, se ignora. No vacía y de hasta 64 caracteres.
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'La contraseña actual es incorrecta' })
  currentPassword?: string;
}
