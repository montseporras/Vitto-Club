import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { AuditQueryService } from '../application/audit-query.service.js';
import { Roles } from '../../shared/security/roles.decorator.js';
import { AuditActorResponseDto, AuditPageResponseDto } from './dto/audit-response.dto.js';
import { ListAuditQueryDto } from './dto/list-audit-query.dto.js';
import { AuditExceptionFilter } from './filters/audit-exception.filter.js';

// US-58: consulta del historial. Solo lectura y solo del Administrador (contrato §3.9.1, regla 2):
// no hay endpoints de alta, modificación, borrado ni exportación.
@Controller('auditoria')
@Roles('ADMIN')
@UseFilters(AuditExceptionFilter)
export class AuditController {
  constructor(private readonly auditQueryService: AuditQueryService) {}

  // GET /api/auditoria?module=CUSTOMERS&action=CUSTOMER_CREATED&fromDate=2026-10-01&page=1&limit=10
  @Get()
  async findAll(@Query() query: ListAuditQueryDto): Promise<AuditPageResponseDto> {
    const page = await this.auditQueryService.list({
      actor: query.actor,
      module: query.module,
      action: query.action,
      documentType: query.documentType,
      documentNumber: query.documentNumber,
      fromDate: query.fromDate,
      toDate: query.toDate,
      date: query.date,
      operationCode: query.operationCode,
      page: query.page,
      limit: query.limit,
    });
    return AuditPageResponseDto.from(page, query.page, query.limit);
  }

  // GET /api/auditoria/actores -> opciones del filtro "Realizado por"
  @Get('actores')
  async findActors(): Promise<AuditActorResponseDto[]> {
    const actors = await this.auditQueryService.listActors();
    return actors.map((actor) => AuditActorResponseDto.from(actor));
  }
}
