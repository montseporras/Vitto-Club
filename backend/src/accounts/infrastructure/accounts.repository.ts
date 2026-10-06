import { Injectable, NotFoundException } from '@nestjs/common';
import type { Account as PrismaAccountRecord } from '@prisma/client';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import type { AccountRole } from '../domain/account-role.js';

// Esta tabla también guarda cuentas de Customer (role CUSTOMER, employeeId null); nuestro
// dominio Account solo modela cuentas de empleado, así que toda query de este repositorio
// filtra explícitamente employeeId no nulo antes de llegar acá.
export function toDomain(record: PrismaAccountRecord): Account {
  if (record.employeeId === null) {
    throw new Error(`Account ${record.id} has no employeeId: not an employee account`);
  }

  return Account.reconstruct({
    id: record.id,
    employeeId: record.employeeId,
    email: record.email,
    passwordHash: record.passwordHash,
    active: record.isActive,
    // La tabla real (a diferencia de Employee/Customer) no tiene columna "deactivatedAt":
    // nuestro dominio la modela, pero nunca se puede reconstruir desde la base. Siempre null.
    deactivatedAt: null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

@Injectable()
export class AccountPrismaRepository implements AccountRepository {
  // Inyecta PrismaTransactionRunner (no PrismaService) y usa .client en cada query: así
  // participa de la transacción ambiente abierta por AccountsService/EmployeesService sin
  // que este repositorio sepa nada de transacciones (ver docs/ARCHITECTURE.md).
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  // Account.email es NOT NULL + UNIQUE (migración 20261006001522_account_email: antes era
  // Account.identifier). Para una cuenta de empleado, Account.email = Employee.email
  // (comentario del schema: "Copy of Employee.email (not editable)...").
  async save(account: Account): Promise<Account> {
    const employeeId = account.getEmployeeId();
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const created = await this.prisma.account.create({
      data: {
        employeeId,
        passwordHash: account.getPasswordHash(),
        isActive: account.isActive(),
        email: employee.email,
        role: employee.role,
      },
    });

    return toDomain(created);
  }

  async findById(id: number): Promise<Account | null> {
    const record = await this.prisma.account.findFirst({
      where: { id, employeeId: { not: null } },
    });
    return record ? toDomain(record) : null;
  }

  async findByEmployeeId(employeeId: number): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({ where: { employeeId } });
    return record ? toDomain(record) : null;
  }

  // Login: todos los roles usan email + password. Si la fila encontrada es de un customer
  // (employeeId null), se trata como "no encontrada" en vez de lanzar: ese caso está fuera
  // de este dominio (todavía no modelado), no es un dato inconsistente.
  async findByEmail(email: string): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({ where: { email } });
    if (!record || record.employeeId === null) return null;
    return toDomain(record);
  }

  async existsByEmployeeId(employeeId: number): Promise<boolean> {
    const match = await this.prisma.account.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    return match !== null;
  }

  async updatePasswordHash(account: Account): Promise<void> {
    const id = account.getId();
    if (!id) {
      throw new NotFoundException('Account id is required to update');
    }

    await this.prisma.account.update({
      where: { id },
      data: { passwordHash: account.getPasswordHash() },
    });
  }

  // Baja/alta lógica: solo se escribe isActive. No hay columna deactivatedAt en la tabla
  // real (a diferencia de Employee/Customer), así que no hay nada más que persistir acá.
  async updateStatus(account: Account): Promise<void> {
    const id = account.getId();
    if (!id) {
      throw new NotFoundException('Account id is required to update');
    }

    await this.prisma.account.update({
      where: { id },
      data: { isActive: account.isActive() },
    });
  }

  // Account.role es una copia derivada de Employee.role (fuente de verdad). Sin lógica de
  // negocio acá: quien llama (el listener de employee.role-changed) ya decidió el valor.
  async syncRoleFromEmployee(accountId: number, role: AccountRole): Promise<void> {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { role },
    });
  }

  // PROVISIONAL (ver domain/port/account.repository.ts): de los employeeId dados, cuántos
  // tienen una Account activa. Usado por la protección del último ADMIN disponible.
  async countActiveByEmployeeIds(employeeIds: number[]): Promise<number> {
    return await this.prisma.account.count({
      where: { employeeId: { in: employeeIds }, isActive: true },
    });
  }
}
