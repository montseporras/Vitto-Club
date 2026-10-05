import { Injectable, NotFoundException } from '@nestjs/common';
import type { Account as PrismaAccountRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Account } from '../domain/account.js';
import { AccountRepository } from '../domain/port/account.repository.js';
import type { EmployeeRole } from '../../employees/domain/employee.js';

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
  constructor(private readonly prisma: PrismaService) {}

  // Account.identifier (ex Account.username, ver migración 20261005213626_account_identifier)
  // es NOT NULL + UNIQUE y nuestro dominio no lo modela, igual que Account.role. Para una
  // cuenta de empleado la solución integrada por auth ya estableció que
  // identifier = Employee.email (comentario del schema: "Employees: copy of Employee.email
  // (not editable)"). No se inventa ninguna otra estrategia.
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
        identifier: employee.email,
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
  // negocio acá: quien llama (AccountsService.updateRole) ya decidió el valor a escribir.
  async syncRoleFromEmployee(accountId: number, role: EmployeeRole): Promise<void> {
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
