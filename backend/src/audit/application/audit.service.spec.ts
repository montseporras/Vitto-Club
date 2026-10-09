import { BadRequestException } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import {
  AuditCategory,
  AuditRepository,
} from '../domain/audit.repository.js';

describe('AuditService', () => {
  let service: AuditService;
  let repository: {
    record: jest.Mock;
    find: jest.Mock;
  };
  let transaction: { run: jest.Mock };

  beforeEach(() => {
    repository = {
      record: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    transaction = {
      run: jest.fn(
        async (operation: () => Promise<unknown>) => await operation(),
      ),
    };
    service = new AuditService(
      repository as unknown as AuditRepository,
      transaction as never,
    );
  });

  it('writes the audit entry within the business operation transaction', async () => {
    const result = await service.capture(
      async () => 'updated',
      (value) => ({
        performedBy: 'Ana Gómez',
        category: AuditCategory.EMPLOYEES,
        action: `Actualización ${value}`,
      }),
    );

    expect(result).toBe('updated');
    expect(transaction.run).toHaveBeenCalledTimes(1);
    expect(repository.record).toHaveBeenCalledWith({
      performedBy: 'Ana Gómez',
      category: AuditCategory.EMPLOYEES,
      action: 'Actualización updated',
    });
  });

  it('does not create an audit entry when the business operation fails', async () => {
    await expect(
      service.capture(
        async () => {
          throw new Error('operation failed');
        },
        () => ({
          performedBy: 'Ana Gómez',
          category: AuditCategory.EMPLOYEES,
          action: 'Actualización',
        }),
      ),
    ).rejects.toThrow('operation failed');

    expect(repository.record).not.toHaveBeenCalled();
  });

  it('rejects an exact date combined with a range', async () => {
    await expect(
      service.list({
        date: '2026-10-09',
        fromDate: '2026-10-01',
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('rejects a reversed date range', async () => {
    await expect(
      service.list({
        fromDate: '2026-10-10',
        toDate: '2026-10-09',
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.find).not.toHaveBeenCalled();
  });
});
