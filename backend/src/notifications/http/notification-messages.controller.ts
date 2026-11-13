import { Body, Controller, Get, Put, UseFilters } from '@nestjs/common';
import { actorOf } from '../../audit/domain/audit-entry.js';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { NotificationMessagesService } from '../application/notification-messages.service.js';
import { SetMessagesDto } from './dto/set-messages.dto.js';
import { NotificationsExceptionFilter } from './filters/notifications-exception.filter.js';

// US-14 (contrato S5 §3.6): mensajes automáticos y puntos de regalo por cumpleaños. Solo el Administrador (§4):
// el Cajero y el Cliente reciben 403 (RolesGuard global).
@Controller('configuracion/mensajes')
@Roles('ADMIN')
@UseFilters(NotificationsExceptionFilter)
export class NotificationMessagesController {
  constructor(private readonly messages: NotificationMessagesService) {}

  // GET /api/configuracion/mensajes (§3.6.1, CA-14.1)
  @Get()
  async get() {
    return await this.messages.get();
  }

  // PUT /api/configuracion/mensajes (§3.6.2, CA-14.1b, CA-14.2, CA-14.3 y CA-14.5). Responde 200 con el mismo
  // cuerpo que el GET y audita una entrada LOGO_AND_MESSAGES_UPDATED.
  @Put()
  async save(@Body() dto: SetMessagesDto, @CurrentUser() user: CurrentUserData) {
    return await this.messages.save(
      { birthdayBonusPoints: dto.birthdayBonusPoints, messages: dto.messages },
      actorOf(user),
    );
  }
}
