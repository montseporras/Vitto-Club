import { IsArray, IsInt, Max, Min } from 'class-validator';
import { BIRTHDAY_POINTS_MESSAGE, MAX_BIRTHDAY_POINTS, MESSAGES_NOT_A_LIST } from '../../domain/notification-messages.js';

// PUT /configuracion/mensajes: `{ birthdayBonusPoints, messages: [{ type, active, subject, body }] }` (contrato S5
// §3.6.2).
export class SetMessagesDto {
  // Entero de 0 a 10.000 (0 = no regala puntos). Un único mensaje para cualquier valor inválido
  @IsInt({ message: BIRTHDAY_POINTS_MESSAGE })
  @Min(0, { message: BIRTHDAY_POINTS_MESSAGE })
  @Max(MAX_BIRTHDAY_POINTS, { message: BIRTHDAY_POINTS_MESSAGE })
  birthdayBonusPoints!: number;

  // Los tres mensajes automáticos. Cada mensaje (tipo, activo, asunto y texto) y que sean exactamente esos tres los
  // valida el dominio (`parseMessageInput` y `validateAutomaticMessages`): así el texto del error es el del contrato,
  // sin el prefijo "messages.1." que el ValidationPipe de Nest le pone a los errores anidados.
  @IsArray({ message: MESSAGES_NOT_A_LIST })
  messages!: unknown[];
}
