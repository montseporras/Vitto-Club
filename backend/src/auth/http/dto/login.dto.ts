import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Un solo login para todos los roles. A propósito NO se valida el formato del email ni el
// largo mínimo de la contraseña: un error de formato le diría a quien prueba credenciales
// qué forma tienen las válidas. Solo se acota el tamaño de lo que entra.
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  password!: string;
}
