import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseFilters } from '@nestjs/common';
import { Roles } from '../../shared/security/roles.decorator.js';
import { NotificationsService } from '../application/notifications.service.js';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto.js';
import { toNotificationDto } from './dto/notification-response.dto.js';
import { NotificationsExceptionFilter } from './filters/notifications-exception.filter.js';

// US-14 (contrato S5 §3.8.4 y §3.8.5): historial de notificaciones y reenvío de un correo que falló. Solo el
// Administrador (§4): el Cajero y el Cliente reciben 403 (RolesGuard global).
@Controller('notificaciones')
@Roles('ADMIN')
@UseFilters(NotificationsExceptionFilter)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // GET /api/notificaciones (CA-14.6): filtros type, status, documentType + documentNumber, fromDate y toDate;
  // paginado de a 20 por fecha descendente
  @Get()
  async list(@Query() query: ListNotificationsQueryDto) {
    const result = await this.notifications.list({
      type: query.type,
      status: query.status,
      documentType: query.documentType,
      documentNumber: query.documentNumber,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });
    return {
      items: result.items.map(toNotificationDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  // POST /api/notificaciones/:id/reenviar (CA-14.8, §3.8.5). Sin body. 202 { id, queued: 1 }: el correo se manda en
  // segundo plano. No se audita (S5-28).
  @Post(':id/reenviar')
  @HttpCode(HttpStatus.ACCEPTED)
  async reenviar(@Param('id', ParseIntPipe) id: number) {
    return await this.notifications.reenviar(id);
  }
}
