import { Module } from '@nestjs/common';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { AuditQueryService } from './application/audit-query.service.js';
import { AuditService } from './application/audit.service.js';
import { AuditRepository } from './domain/port/audit.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { AuditController } from './http/audit.controller.js';
import { AuditPrismaRepository } from './infrastructure/audit.repository.js';

// audit no importa a ningún otro módulo de negocio: todos escriben en él, nunca al revés.
// Escritura (US-57): AuditService.capture. Consulta (US-58): AuditController.
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditQueryService,
    { provide: AuditRepository, useClass: AuditPrismaRepository },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
  ],
  exports: [AuditService],
})
export class AuditModule {}
