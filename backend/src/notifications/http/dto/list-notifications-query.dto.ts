import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DOCUMENT_TYPES, type DocumentType } from '../../../customers/domain/customer.js';
import {
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  type NotificationStatus,
  type NotificationType,
} from '../../domain/notification.js';

// GET /notificaciones (contrato S5 §3.8.4). El formato de las fechas y el rango invertido los valida el dominio,
// con los mismos mensajes que Movimientos de puntos, Consumos y Canjes. Los mensajes de acá siguen el estilo de
// ListRedemptionsQueryDto (el contrato no los cita).
export class ListNotificationsQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES, { message: 'type no es un tipo de notificación válido' })
  type?: NotificationType;

  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES, { message: 'status no es un estado válido' })
  status?: NotificationStatus;

  // DNI por defecto; solo se aplica si viene documentNumber
  @IsOptional()
  @IsIn(DOCUMENT_TYPES, { message: 'documentType debe ser DNI o PASSPORT' })
  documentType?: DocumentType;

  // Coincidencia parcial, normalizada como en Clientes y Canjes
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'documentNumber no puede superar los 20 caracteres' })
  documentNumber?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un entero' })
  @Min(1, { message: 'page debe ser mayor o igual a 1' })
  page: number = 1;

  // Por defecto 20 (§3.8.4); la pantalla puede mandar las filas que entran en su alto (S5-57)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a 1' })
  @Max(100, { message: 'limit no puede superar 100' })
  limit: number = 20;
}
