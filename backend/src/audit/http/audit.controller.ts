import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuditService } from '../application/audit.service.js';
import { AuditQueryDto } from './audit-query.dto.js';
import { Roles } from '../../shared/security/roles.decorator.js';

@Controller('auditoria')
@Roles('ADMIN')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: AuditQueryDto) {
    const { items, total } = await this.auditService.list({
      performedBy: query.performedBy?.trim() || undefined,
      category: query.category,
      documentType: query.documentType,
      documentNumber: query.documentNumber?.trim() || undefined,
      date: query.date,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });
    return { items, total, page: query.page, limit: query.limit };
  }
}
