import { Injectable, NotFoundException } from '@nestjs/common';
import type { Customer as PrismaCustomerRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
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

@Injectable()
export class CustomerPrismaRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const record = await this.prisma.customer.findUnique({
      where: { unique_document: { documentType, documentNumber } },
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

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id },
        data: {
          isActive: customer.isActive(),
          deactivatedAt: customer.getDeactivatedAt(),
        },
      }),
      this.prisma.customerStatusChange.create({
        data: { customerId: id, action },
      }),
    ]);
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
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    return match !== null;
  }

  async list(params: CustomerListParams): Promise<CustomerListResult> {
    const { page, limit, nameContains, active } = params;

    // Cada palabra buscada debe aparecer en el nombre o en el apellido ("juan perez" encuentra a Juan Pérez)
    const terms = nameContains?.split(/\s+/).filter(Boolean) ?? [];

    const where = {
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

    const [records, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: records.map(toDomain), total };
  }
}
