import { Injectable, NotFoundException } from '@nestjs/common';
import type { Customer as PrismaCustomerRecord, Prisma } from '@prisma/client';
import { calculateLevel, type Level } from '../../points/domain/level.js';
import { PrismaTransactionRunner } from '../../prisma/prisma-transaction-runner.js';
import { Customer, DocumentType } from '../domain/customer.js';
import { CustomerStatusAction, CustomerStatusChange } from '../domain/customer-status-change.js';
import {
  CustomerRepository,
  CustomerListParams,
  CustomerListResult,
} from '../domain/port/customer.repository.js';

function toDomain(record: PrismaCustomerRecord): Customer {
  return Customer.reconstruct({
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    documentType: record.documentType as DocumentType,
    documentNumber: record.documentNumber,
    email: record.email,
    phone: record.phone,
    dateOfBirth: record.dateOfBirth,
    active: record.isActive,
    deactivatedAt: record.deactivatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

// Umbrales por defecto de los niveles (CLAUDE.md raíz, §6; coinciden con los defaults del esquema)
const DEFAULT_SILVER_MIN_POINTS = 300;
const DEFAULT_GOLD_MIN_POINTS = 800;

const splitTerms = (text: string | undefined): string[] => text?.split(/\s+/).filter(Boolean) ?? [];

// Clientes cuyo lifetimePoints cae en el rango del nivel. Sin fila en customer_points = 0 puntos.
function levelFilter(
  level: Level,
  config: { silverMinPoints: number; goldMinPoints: number },
): Prisma.CustomerWhereInput {
  if (level === 'GOLD') {
    return { points: { is: { lifetimePoints: { gte: config.goldMinPoints } } } };
  }
  if (level === 'SILVER') {
    return {
      points: { is: { lifetimePoints: { gte: config.silverMinPoints, lt: config.goldMinPoints } } },
    };
  }
  return {
    OR: [{ points: { is: null } }, { points: { is: { lifetimePoints: { lt: config.silverMinPoints } } } }],
  };
}

@Injectable()
export class CustomerPrismaRepository implements CustomerRepository {
  // Inyecta PrismaTransactionRunner (no PrismaService) y usa .client en cada query: así
  // participa de la transacción ambiente abierta por quien lo llame (por ejemplo el registro
  // de clientes en accounts) sin que este repositorio sepa nada de transacciones — .client es
  // el cliente normal si no hay ninguna abierta (ver docs/ARCHITECTURE.md).
  constructor(private readonly transactionRunner: PrismaTransactionRunner) {}

  private get prisma() {
    return this.transactionRunner.client;
  }

  async save(customer: Customer): Promise<Customer> {
    const created = await this.prisma.customer.create({
      data: {
        firstName: customer.getFirstName(),
        lastName: customer.getLastName(),
        documentType: customer.getDocumentType(),
        documentNumber: customer.getDocumentNumber(),
        email: customer.getEmail(),
        phone: customer.getPhone(),
        dateOfBirth: customer.getDateOfBirth(),
        isActive: customer.isActive(),
        deactivatedAt: customer.getDeactivatedAt(),
      },
    });

    return toDomain(created);
  }

  async findById(id: number): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByDocument(
    documentType: DocumentType,
    documentNumber: string,
  ): Promise<Customer | null> {
    // El activo primero; si no hay, el inactivo más reciente
    const record = await this.prisma.customer.findFirst({
      where: { documentType, documentNumber },
      orderBy: [{ isActive: 'desc' }, { id: 'desc' }],
    });
    return record ? toDomain(record) : null;
  }

  async findAll(): Promise<Customer[]> {
    const records = await this.prisma.customer.findMany({
      orderBy: { id: 'asc' },
    });
    return records.map(toDomain);
  }

  async update(customer: Customer): Promise<void> {
    const id = customer.getId();

    if (!id) {
      throw new NotFoundException('Customer id is required to update');
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        firstName: customer.getFirstName(),
        lastName: customer.getLastName(),
        documentType: customer.getDocumentType(),
        documentNumber: customer.getDocumentNumber(),
        email: customer.getEmail(),
        phone: customer.getPhone(),
        dateOfBirth: customer.getDateOfBirth(),
        isActive: customer.isActive(),
        deactivatedAt: customer.getDeactivatedAt(),
      },
    });
  }

  // El cambio de estado y su registro en el historial se guardan en una sola transacción
  async updateStatus(customer: Customer, action: CustomerStatusAction): Promise<void> {
    const id = customer.getId();

    if (!id) {
      throw new NotFoundException('Customer id is required to update');
    }

    // El cliente de una transacción no tiene $transaction: se usa la transacción ambiente.
    // Si ya hay una abierta, se suma a ella; si no, abre una propia.
    await this.transactionRunner.run(async () => {
      await this.prisma.customer.update({
        where: { id },
        data: {
          isActive: customer.isActive(),
          deactivatedAt: customer.getDeactivatedAt(),
        },
      });
      await this.prisma.customerStatusChange.create({
        data: { customerId: id, action },
      });
    });
  }

  async findStatusHistory(customerId: number): Promise<CustomerStatusChange[]> {
    const records = await this.prisma.customerStatusChange.findMany({
      where: { customerId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => ({
      id: record.id,
      action: record.action,
      createdAt: record.createdAt,
    }));
  }

  async existsByDocument(
    documentType: DocumentType,
    documentNumber: string,
    excludeId?: number,
  ): Promise<boolean> {
    const match = await this.prisma.customer.findFirst({
      where: {
        documentType,
        documentNumber,
        isActive: true,
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    return match !== null;
  }

  async existsByEmail(email: string, options: { onlyActive?: boolean } = {}): Promise<boolean> {
    const match = await this.prisma.customer.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(options.onlyActive ? { isActive: true } : {}),
      },
      select: { id: true },
    });

    return match !== null;
  }

  async list(params: CustomerListParams): Promise<CustomerListResult> {
    const { page, limit, nameContains, search, level, sort, active } = params;

    // El nivel no se guarda por cliente: se calcula con lifetimePoints contra los umbrales vigentes
    // (contrato §3.7). Se leen acá, igual que hace points, para poder filtrar por nivel en la consulta.
    // Sin configuración activa rigen los umbrales por defecto: el listado no tiene que caerse por eso.
    const config = (await this.prisma.loyaltyProgramConfiguration.findFirst({
      where: { isActive: true },
      select: { silverMinPoints: true, goldMinPoints: true },
    })) ?? { silverMinPoints: DEFAULT_SILVER_MIN_POINTS, goldMinPoints: DEFAULT_GOLD_MIN_POINTS };

    // Cada palabra buscada debe aparecer en el nombre o en el apellido ("juan perez" encuentra a Juan Pérez)
    const nameTerms = splitTerms(nameContains).map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' as const } },
        { lastName: { contains: term, mode: 'insensitive' as const } },
      ],
    }));

    // q: cada palabra debe aparecer en el nombre, el apellido o el documento (normalizado, parcial)
    const searchTerms = splitTerms(search).map((term) => {
      const normalizedDocument = term.replace(/[\s.-]/g, '').toUpperCase();
      return {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' as const } },
          { lastName: { contains: term, mode: 'insensitive' as const } },
          ...(normalizedDocument ? [{ documentNumber: { contains: normalizedDocument } }] : []),
        ],
      };
    });

    const where: Prisma.CustomerWhereInput = {
      AND: [
        ...(active !== undefined ? [{ isActive: active }] : []),
        ...nameTerms,
        ...searchTerms,
        ...(level ? [levelFilter(level, config)] : []),
      ],
    };

    const [records, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { points: { select: { balance: true, lifetimePoints: true } } },
        orderBy:
          sort === 'lastName'
            ? [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }]
            : { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: records.map((record) => {
        // Sin fila en customer_points el cliente nunca tuvo movimientos: todo en 0
        const balance = record.points?.balance ?? 0;
        const lifetimePoints = record.points?.lifetimePoints ?? 0;
        return {
          customer: toDomain(record),
          balance,
          lifetimePoints,
          level: calculateLevel(lifetimePoints, config.silverMinPoints, config.goldMinPoints).current,
        };
      }),
      total,
    };
  }

  async findBalance(customerId: number): Promise<number> {
    const row = await this.prisma.customerPoints.findUnique({
      where: { customerId },
      select: { balance: true },
    });
    return row?.balance ?? 0;
  }
}
