import { AuditService } from './audit.service.js';
import type { AuditEntryInput } from '../domain/audit-entry.js';
import { InvalidAuditEntryError } from '../domain/errors/invalid-audit-entry.error.js';
import { AuditRepository } from '../domain/port/audit.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

const entry = (overrides: Partial<AuditEntryInput> = {}): AuditEntryInput => ({
  actor: { type: 'EMPLOYEE', accountId: 1 },
  module: 'CUSTOMERS',
  action: 'CUSTOMER_CREATED',
  description: 'Registró al cliente Sofía Ríos',
  details: [],
  ...overrides,
});

describe('AuditService', () => {
  let repository: { record: jest.Mock };
  let runner: { run: jest.Mock };
  let service: AuditService;

  beforeEach(() => {
    repository = { record: jest.fn().mockResolvedValue(undefined) };
    runner = { run: jest.fn((fn: () => Promise<unknown>) => fn()) };
    service = new AuditService(
      repository as unknown as AuditRepository,
      runner as unknown as TransactionRunner,
    );
  });

  it('ejecuta la operación y escribe la auditoría dentro de la misma transacción', async () => {
    const order: string[] = [];
    runner.run.mockImplementation(async (fn: () => Promise<unknown>) => {
      order.push('begin');
      const result = await fn();
      order.push('commit');
      return result;
    });
    repository.record.mockImplementation(async () => {
      order.push('audit');
    });

    const result = await service.capture(
      async () => {
        order.push('operation');
        return 42;
      },
      () => entry(),
    );

    expect(result).toBe(42);
    expect(order).toEqual(['begin', 'operation', 'audit', 'commit']);
  });

  it('arma la entrada con el resultado de la operación', async () => {
    await service.capture(
      async () => ({ name: 'Sofía Ríos' }),
      (created) => entry({ description: `Registró al cliente ${created.name}` }),
    );

    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Registró al cliente Sofía Ríos' }),
    );
  });

  it('escribe una entrada por cada elemento si buildEntry devuelve un arreglo', async () => {
    await service.capture(
      async () => 1,
      () => [entry(), entry({ action: 'CUSTOMER_UPDATED' })],
    );

    expect(repository.record).toHaveBeenCalledTimes(2);
  });

  it('si buildEntry devuelve null no escribe nada', async () => {
    await service.capture(
      async () => 1,
      () => null,
    );

    expect(repository.record).not.toHaveBeenCalled();
  });

  it('si la operación falla no audita y propaga el error', async () => {
    await expect(
      service.capture(
        async () => {
          throw new Error('operación fallida');
        },
        () => entry(),
      ),
    ).rejects.toThrow('operación fallida');
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('si falla la escritura de la auditoría, el error llega a la transacción (rollback)', async () => {
    repository.record.mockRejectedValue(new Error('disco lleno'));

    await expect(
      service.capture(
        async () => 1,
        () => entry(),
      ),
    ).rejects.toThrow('disco lleno');
  });

  it('no guarda una entrada incompleta (CA-57.9)', async () => {
    await expect(
      service.capture(
        async () => 1,
        () => entry({ description: '' }),
      ),
    ).rejects.toThrow(InvalidAuditEntryError);
    expect(repository.record).not.toHaveBeenCalled();
  });
});
