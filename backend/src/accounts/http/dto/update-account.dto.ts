import { IsString, MaxLength, MinLength } from 'class-validator';

// US-06. Body: solo la contraseña nueva. El rol del empleado se cambia únicamente desde
// empleados (decisión del PO, 06/10; contrato §3.11.2: "El rol no viaja"). Si se envía `role`
// (o cualquier otro campo), el ValidationPipe global (forbidNonWhitelisted) responde 400. El
// email tampoco se edita desde acá.
export class UpdateAccountDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
