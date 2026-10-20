import { Module } from '@nestjs/common';
import { PrismaTransactionRunner } from '../prisma/prisma-transaction-runner.js';
import { AuditService } from './application/audit.service.js';
import { AuditRepository } from './domain/port/audit.repository.js';
import { TransactionRunner } from './domain/port/transaction-runner.js';
import { AuditPrismaRepository } from './infrastructure/audit.repository.js';

// audit no importa a ningún otro módulo de negocio: todos escriben en él, nunca al revés.
// El listado (US-58) se suma acá.
@Module({
  providers: [
    AuditService,
    { provide: AuditRepository, useClass: AuditPrismaRepository },
    { provide: TransactionRunner, useExisting: PrismaTransactionRunner },
  ],
  exports: [AuditService],
})
export class AuditModule {}
