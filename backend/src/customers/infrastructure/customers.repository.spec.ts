import { CustomerPrismaRepository } from './customers.repository.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Customer } from '../domain/customer.js';

// Cliente de Prisma simulado: solo lo que usan estos tests. Registra el orden de las
// escrituras para comprobar que van juntas dentro de la transacción.
function fakePrisma(calls: string[]) {
  return {
    customer: {
      update: jest.fn(async () => {
        calls.push('customer.update');
      }),
      findFirst: jest.fn(async () => null),
    },
    customerStatusChange: {
      create: jest.fn(async () => {
        calls.push('customerStatusChange.create');
      }),
    },
  };
}

// El repositorio usa .client para las queries y run() para agrupar escrituras. Este fake
// marca cuándo se abre y se cierra la transacción.
function fakeTransactionRunner(prismaLike: object, calls: string[]): PrismaTransactionRunner {
  return {
    client: prismaLike,
    run: async <T>(fn: () => Promise<T>): Promise<T> => {
      calls.push('run:start');
      const result = await fn();
      calls.push('run:end');
      return result;
    },
  } as unknown as PrismaTransactionRunner;
}

function persistedCustomer(active: boolean): Customer {
  return Customer.reconstruct({
    id: 7,
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI',
    documentNumber: '12345678',
    email: 'juan@example.com',
    active,
    deactivatedAt: active ? null : new Date('2026-10-01T00:00:00Z'),
  });
}

describe('CustomerPrismaRepository', () => {
  describe('updateStatus()', () => {
    it('guarda el estado y el registro del historial dentro de una misma transacción', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

      await repo.updateStatus(persistedCustomer(false), 'DEACTIVATED');

      expect(calls).toEqual(['run:start', 'customer.update', 'customerStatusChange.create', 'run:end']);
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { isActive: false, deactivatedAt: new Date('2026-10-01T00:00:00Z') },
      });
      expect(prisma.customerStatusChange.create).toHaveBeenCalledWith({
        data: { customerId: 7, action: 'DEACTIVATED' },
      });
    });

    it('si falla el historial, el error llega a quien llamó (y la transacción se deshace)', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      prisma.customerStatusChange.create.mockRejectedValueOnce(new Error('db down'));
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

      await expect(repo.updateStatus(persistedCustomer(true), 'ACTIVATED')).rejects.toThrow('db down');
      expect(calls).not.toContain('run:end');
    });

    it('sin id lanza error y no escribe nada', async () => {
      const calls: string[] = [];
      const prisma = fakePrisma(calls);
      const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));
      const unsaved = Customer.create({
        firstName: 'Juan',
        lastName: 'Pérez',
        documentType: 'DNI',
        documentNumber: '12345678',
        email: 'juan@example.com',
      });

      await expect(repo.updateStatus(unsaved, 'DEACTIVATED')).rejects.toThrow('Customer id is required');
      expect(calls).toEqual([]);
    });
  });

  it('las consultas usan el cliente de la transacción en curso (.client)', async () => {
    const calls: string[] = [];
    const prisma = fakePrisma(calls);
    const repo = new CustomerPrismaRepository(fakeTransactionRunner(prisma, calls));

    await repo.existsByEmail('juan@example.com');

    expect(prisma.customer.findFirst).toHaveBeenCalledTimes(1);
  });
});
