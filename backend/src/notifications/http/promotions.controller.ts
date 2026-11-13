import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseFilters,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../shared/security/current-user.decorator.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { PromotionsService } from '../application/promotions.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { toPromotionSendDto } from './dto/promotion-response.dto.js';
import { PromotionRecipientsQueryDto } from './dto/promotion-recipients-query.dto.js';
import { NotificationsExceptionFilter } from './filters/notifications-exception.filter.js';

// US-15 y US-49 (contrato S5 §3.7): envío de promociones. Solo el Administrador (§4): el Cajero y el Cliente reciben 403
// (RolesGuard global). Ya no existen `GET /customers/me/promociones` ni el ABM de `/promociones` (S5-36): esas rutas
// responden 404.
@Controller('promociones')
@Roles('ADMIN')
@UseFilters(NotificationsExceptionFilter)
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  // GET /api/promociones/destinatarios (§3.7.2, CA-15.3): `{ count }`
  @Get('destinatarios')
  async recipients(@Query() query: PromotionRecipientsQueryDto) {
    return await this.promotions.countRecipients(query.level ?? null);
  }

  // POST /api/promociones/envios (§3.7.3, CA-15.2 a CA-15.4). "Ahora": 202 { id, queued: n } y los correos salen en segundo
  // plano. Programado: 201 con el envío SCHEDULED. No se audita (S5-28).
  @Post('envios')
  async create(
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: CurrentUserData,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.promotions.create(
      { subject: dto.subject, body: dto.body, level: dto.level ?? null, scheduledAt: dto.scheduledAt ?? null },
      { employeeId: user.employeeId as number },
    );
    if (result.kind === 'NOW') {
      response.status(HttpStatus.ACCEPTED);
      return { id: result.id, queued: result.queued };
    }
    response.status(HttpStatus.CREATED);
    return toPromotionSendDto(result.send);
  }

  // GET /api/promociones/envios (§3.7.4, CA-15.5): los programados que todavía no salieron
  @Get('envios')
  async listScheduled() {
    return (await this.promotions.listScheduled()).map(toPromotionSendDto);
  }

  // PATCH /api/promociones/envios/:id/cancelar (§3.7.4, CA-15.5). 200 con el envío CANCELLED
  @Patch('envios/:id/cancelar')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return toPromotionSendDto(await this.promotions.cancel(id));
  }
}
