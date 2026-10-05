import { NotFoundException } from '@nestjs/common';
import { AccountPrismaRepository, toDomain } from './accounts.repository.js';
import { Account } from '../domain/account.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';

// Mock liviano: no hace falta una base real para verificar que el repositorio llama al
// delegado correcto con los argumentos correctos y mapea bien el resultado (mismo espíritu
// que buildEmployeeWhere en employees.repository.spec.ts, pero acá además hace falta
// mockear el cliente porque no hay una función pura equivalente).
function fakePrisma() {
  return {
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  };
}

// El repositorio ahora inyecta PrismaTransactionRunner y usa su getter .client en vez de
// PrismaService directo (ver docs/ARCHITECTURE.md).
function fakeTransactionRunner(prismaLike: ReturnType<typeof fakePrisma>): PrismaTransactionRunner {
  return { client: prismaLike } as unknown as PrismaTransactionRunner;
}

const BASE_RECORD = {
  id: 7,
  identifier: 'bruno.perez@vitto.club',
  passwordHash: 'hashed:secreta123',
  role: 'CASHIER' as const,
  isActive: true,
  employeeId: 2,
  customerId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const EMPLOYEE_RECORD = {
  id: 2,
  firstName: 'Bruno',
  lastName: 'Pérez',
  phone: '3510000002',
  email: 'bruno.perez@vitto.club',
  role: 'CASHIER' as const,
  isActive: true,
  deactivatedAt: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

describe('toDomain (mapeo Account dominio <-> Prisma)', () => {
  it('mapea los campos que el dominio sí modela e ignora identifier/role', () => {
    const account = toDomain(BASE_RECORD);

    expect(account.getId()).toBe(7);
    expect(account.getEmployeeId()).toBe(2);
    expect(account.getPasswordHash()).toBe('hashed:secreta123');
    expect(account.isActive()).toBe(true);
    // La tabla real no tiene deactivatedAt: el dominio siempre lo reconstruye en null.
    expect(account.getDeactivatedAt()).toBeNull();
    expect(account.getCreatedAt()).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('lanza si el registro no tiene employeeId (cuenta de customer, fuera de este dominio)', () => {
    expect(() => toDomain({ ...BASE_RECORD, employeeId: null, customerId: 9 })).toThrow(
      /no employeeId/,
    );
  });
});

describe('AccountPrismaRepository', () => {
  describe('save()', () => {
    it('guarda la Account vinculada al Employee correcto, con identifier = Employee.email y role = Employee.role', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);
      (prisma.account.create as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 2, passwordHash: 'hashed:secreta123' });

      const saved = await repo.save(account);

      expect(prisma.employee.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          employeeId: 2,
          passwordHash: 'hashed:secreta123',
          isActive: true,
          identifier: 'bruno.perez@vitto.club', // = Employee.email, nunca un username
          role: 'CASHIER', // = Employee.role, fuente de verdad
        },
      });
      expect(saved.getEmployeeId()).toBe(2);
      expect(saved.getPasswordHash()).toBe('hashed:secreta123');
      expect(saved.isActive()).toBe(true);
    });

    it('persiste isActive y employeeId tal como vienen del dominio', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ ...EMPLOYEE_RECORD, id: 9 });
      (prisma.account.create as jest.Mock).mockResolvedValue({ ...BASE_RECORD, employeeId: 9 });
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 9, passwordHash: 'hashed:x' });

      await repo.save(account);

      const call = (prisma.account.create as jest.Mock).mock.calls[0][0];
      expect(call.data.employeeId).toBe(9);
      expect(call.data.isActive).toBe(true);
    });

    it('no usa username en ningún momento: el payload del INSERT no tiene esa clave', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);
      (prisma.account.create as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 2, passwordHash: 'hashed:x' });

      await repo.save(account);

      const call = (prisma.account.create as jest.Mock).mock.calls[0][0];
      expect(call.data).not.toHaveProperty('username');
      expect(call.data.identifier).toBe(EMPLOYEE_RECORD.email);
    });

    it('no inventa un identifier propio: siempre sale de Employee.email, sin importar employeeId/passwordHash', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        ...EMPLOYEE_RECORD,
        email: 'otro.correo@vitto.club',
      });
      (prisma.account.create as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 2, passwordHash: 'hashed:x' });

      await repo.save(account);

      const call = (prisma.account.create as jest.Mock).mock.calls[0][0];
      expect(call.data.identifier).toBe('otro.correo@vitto.club');
    });

    it('si el Employee no existe, no crea ninguna Account (404, no INSERT)', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 999, passwordHash: 'hashed:x' });

      await expect(repo.save(account)).rejects.toThrow(NotFoundException);
      expect(prisma.account.create).not.toHaveBeenCalled();
    });

    it('la Account reconstruida a partir del resultado sigue sin exponer identifier/role (AccountProfile los toma de Employee)', async () => {
      const prisma = fakePrisma();
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);
      (prisma.account.create as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.create({ employeeId: 2, passwordHash: 'hashed:secreta123' });

      const saved = await repo.save(account);

      // El dominio Account no tiene getters para identifier/role ni para passwordHash
      // expuestos fuera de getPasswordHash(): nada de esto se filtra a un AccountProfile.
      expect(saved).not.toHaveProperty('identifier');
      expect(saved).not.toHaveProperty('role');
    });
  });

  describe('findById()', () => {
    it('filtra employeeId no nulo y mapea el resultado', async () => {
      const prisma = fakePrisma();
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      const account = await repo.findById(7);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 7, employeeId: { not: null } },
      });
      expect(account?.getEmployeeId()).toBe(2);
    });

    it('devuelve null si no existe', async () => {
      const prisma = fakePrisma();
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('findByIdentifier()', () => {
    it('busca por el unique identifier y mapea el resultado (login de empleados)', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      const account = await repo.findByIdentifier('bruno.perez@vitto.club');

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { identifier: 'bruno.perez@vitto.club' },
      });
      expect(account?.getEmployeeId()).toBe(2);
    });

    it('devuelve null si no existe ningún identifier así', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findByIdentifier('nadie@vitto.club')).toBeNull();
    });

    it('devuelve null (no lanza) si el identifier es de una cuenta de customer', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        ...BASE_RECORD,
        employeeId: null,
        customerId: 9,
      });
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.findByIdentifier('40123456')).toBeNull();
    });
  });

  describe('findByEmployeeId()', () => {
    it('busca por el unique employeeId y mapea el resultado', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(BASE_RECORD);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      const account = await repo.findByEmployeeId(2);

      expect(prisma.account.findUnique).toHaveBeenCalledWith({ where: { employeeId: 2 } });
      expect(account?.getId()).toBe(7);
    });
  });

  describe('existsByEmployeeId()', () => {
    it('true si Prisma encuentra un id', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({ id: 7 });
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.existsByEmployeeId(2)).toBe(true);
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { employeeId: 2 },
        select: { id: true },
      });
    });

    it('false si Prisma no encuentra nada', async () => {
      const prisma = fakePrisma();
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      expect(await repo.existsByEmployeeId(999)).toBe(false);
    });
  });

  describe('updatePasswordHash()', () => {
    it('escribe solo passwordHash', async () => {
      const prisma = fakePrisma();
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.reconstruct({ ...toReconstructInput(BASE_RECORD), passwordHash: 'hashed:nueva' });

      await repo.updatePasswordHash(account);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { passwordHash: 'hashed:nueva' },
      });
    });

    it('lanza NotFoundException si la Account no tiene id', async () => {
      const repo = new AccountPrismaRepository(fakeTransactionRunner(fakePrisma()));
      const account = Account.create({ employeeId: 2, passwordHash: 'x' });

      await expect(repo.updatePasswordHash(account)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus()', () => {
    it('escribe solo isActive (no hay deactivatedAt en la tabla real)', async () => {
      const prisma = fakePrisma();
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));
      const account = Account.reconstruct(toReconstructInput(BASE_RECORD));
      account.deactivate();

      await repo.updateStatus(account);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { isActive: false },
      });
    });
  });

  describe('syncRoleFromEmployee()', () => {
    it('escribe solo role, sin tocar isActive ni passwordHash', async () => {
      const prisma = fakePrisma();
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      await repo.syncRoleFromEmployee(7, 'ADMIN');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { role: 'ADMIN' },
      });
    });
  });

  describe('countActiveByEmployeeIds()', () => {
    it('cuenta solo cuentas activas entre los employeeId dados', async () => {
      const prisma = fakePrisma();
      (prisma.account.count as jest.Mock).mockResolvedValue(2);
      const repo = new AccountPrismaRepository(fakeTransactionRunner(prisma));

      const count = await repo.countActiveByEmployeeIds([1, 2, 3]);

      expect(count).toBe(2);
      expect(prisma.account.count).toHaveBeenCalledWith({
        where: { employeeId: { in: [1, 2, 3] }, isActive: true },
      });
    });
  });
});

function toReconstructInput(record: typeof BASE_RECORD) {
  return {
    id: record.id,
    employeeId: record.employeeId as number,
    passwordHash: record.passwordHash,
    active: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
