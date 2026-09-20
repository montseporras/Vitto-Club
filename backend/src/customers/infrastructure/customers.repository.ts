import { Injectable, NotFoundException } from '@nestjs/common';
import type { Customer as PrismaCustomerRecord } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Customer, DocumentType } from '../domain/customer.js';
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

    const where = {
      ...(active !== undefined ? { isActive: active } : {}),
      ...(nameContains
        ? {
            OR: [
              { firstName: { contains: nameContains, mode: 'insensitive' as const } },
              { lastName: { contains: nameContains, mode: 'insensitive' as const } },
            ],
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
