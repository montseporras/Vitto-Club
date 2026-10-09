import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  AuditFilters,
  AuditPage,
  RecordAuditEntry,
} from '../domain/audit.repository.js';
import { AuditRepository } from '../domain/audit.repository.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    private readonly transactions: PrismaTransactionRunner,
  ) {}

  async record(entry: RecordAuditEntry): Promise<void> {
    await this.repository.record(entry);
  }

  async capture<T>(
    operation: () => Promise<T>,
    createEntry: (result: T) => RecordAuditEntry | null,
  ): Promise<T> {
    return await this.transactions.run(async () => {
      const result = await operation();
      const entry = createEntry(result);
      if (entry) await this.repository.record(entry);
      return result;
    });
  }

  async list(filters: AuditFilters): Promise<AuditPage> {
    if (filters.date && (filters.fromDate || filters.toDate)) {
      throw new BadRequestException(
        'Use either date or a date range, not both',
      );
    }
    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      throw new BadRequestException('fromDate must not be later than toDate');
    }
    return await this.repository.find(filters);
  }
}
