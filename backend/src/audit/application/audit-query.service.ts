import { Injectable } from '@nestjs/common';
import { buildAuditFilters, type AuditActorOption, type AuditFilterInput } from '../domain/audit-filters.js';
import type { AuditPage } from '../domain/audit-record.js';
import { AuditRepository } from '../domain/port/audit.repository.js';

// Consulta del historial (US-58). Solo lee: no abre transacción ni escribe nada.
@Injectable()
export class AuditQueryService {
  constructor(private readonly repository: AuditRepository) {}

  // Valida las reglas del contrato (§3.9.4) y devuelve la página pedida
  async list(input: AuditFilterInput): Promise<AuditPage> {
    return await this.repository.find(buildAuditFilters(input));
  }

  async listActors(): Promise<AuditActorOption[]> {
    return await this.repository.findActors();
  }
}
