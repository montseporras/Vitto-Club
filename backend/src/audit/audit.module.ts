import { Module } from '@nestjs/common';
import { AuditService } from './application/audit.service.js';
import { AuditRepository } from './domain/audit.repository.js';
import { AuditPrismaRepository } from './infrastructure/audit-prisma.repository.js';
import { AuditController } from './http/audit.controller.js';

@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: AuditRepository, useClass: AuditPrismaRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
