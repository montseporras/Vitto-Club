import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Employee as PrismaEmployeeRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Employee, EmployeeRole } from '../domain/employee.js';
import { EmployeeListFilters, EmployeeRepository } from '../domain/port/employee.repository.js';

// TODO: la columna `phone` es NOT NULL en el schema, pero el teléfono es opcional para el negocio.
// Mientras no se migre a `String?`, "sin teléfono" se guarda como '' y se lee como null.
const NO_PHONE = '';

function toDomain(record: PrismaEmployeeRecord): Employee {
  return Employee.reconstruct({
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    role: record.role as EmployeeRole,
    phone: record.phone === NO_PHONE ? null : record.phone,
    active: record.isActive,
    deactivatedAt: record.deactivatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

// Arma el filtro del listado (US-03). Cada palabra buscada debe aparecer en el nombre o en el
// apellido, sin distinguir mayúsculas ("ana gomez" encuentra a Ana Gómez).
export function buildEmployeeWhere(filters: EmployeeListFilters = {}): Prisma.EmployeeWhereInput {
  const { nameContains, active } = filters;
  const terms = nameContains?.split(/\s+/).filter(Boolean) ?? [];

  return {
    ...(active !== undefined ? { isActive: active } : {}),
    ...(terms.length > 0
      ? {
          AND: terms.map((term) => ({
            OR: [
              { firstName: { contains: term, mode: 'insensitive' as const } },
              { lastName: { contains: term, mode: 'insensitive' as const } },
            ],
          })),
        }
      : {}),
  };
}

@Injectable()
export class EmployeePrismaRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(employee: Employee): Promise<Employee> {
    const created = await this.prisma.employee.create({
      data: {
        firstName: employee.getFirstName(),
        lastName: employee.getLastName(),
        email: employee.getEmail(),
        role: employee.getRole(),
        phone: employee.getPhone() ?? NO_PHONE,
        isActive: employee.isActive(),
        deactivatedAt: employee.getDeactivatedAt(),
      },
    });

    return toDomain(created);
  }

  async findById(id: number): Promise<Employee | null> {
    const record = await this.prisma.employee.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findAll(filters: EmployeeListFilters = {}): Promise<Employee[]> {
    const records = await this.prisma.employee.findMany({
      where: buildEmployeeWhere(filters),
      // Por apellido; nombre e id desempatan para que el orden sea siempre el mismo.
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }],
    });
    return records.map(toDomain);
  }

  // Solo se escriben los datos editables: el email y el estado no se tocan desde acá
  async update(employee: Employee): Promise<void> {
    const id = employee.getId();

    if (!id) {
      throw new NotFoundException('Employee id is required to update');
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        firstName: employee.getFirstName(),
        lastName: employee.getLastName(),
        role: employee.getRole(),
        phone: employee.getPhone() ?? NO_PHONE,
      },
    });
  }

  // Baja lógica: solo se escribe el estado. Este repositorio nunca hace DELETE.
  async updateStatus(employee: Employee): Promise<void> {
    const id = employee.getId();

    if (!id) {
      throw new NotFoundException('Employee id is required to update');
    }

    await this.prisma.employee.update({
      where: { id },
      data: {
        isActive: employee.isActive(),
        deactivatedAt: employee.getDeactivatedAt(),
      },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const match = await this.prisma.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });

    return match !== null;
  }
}
