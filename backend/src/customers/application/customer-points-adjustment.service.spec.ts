import { ConflictException, NotFoundException } from '@nestjs/common';
import { Customer } from '../domain/customer.js';
import { Employee } from '../../employees/domain/employee.js';
import type { EmployeesService } from '../../employees/application/employees.service.js';
import type { AjustarInput, AjustarResult, PointsService } from '../../points/application/points.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import type { TransactionRunner } from '../domain/port/transaction-runner.js';
import type { CustomersService } from './customers.service.js';
import { CustomerPointsAdjustmentService } from './customer-points-adjustment.service.js';

class PassthroughTransactionRunner implements TransactionRunner {
  runs = 0;
  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.runs += 1;
    return fn();
  }
}

class FakeCustomersService {
  private readonly customers = new Map<number, Customer>();

  seed(customer: Customer): void {
    this.customers.set(customer.getId() as number, customer);
  }

  async findById(id: number): Promise<Customer> {
    const customer = this.customers.get(id);
    if (!customer) throw new NotFoundException(`Customer with ID ${id} not found`);
    return customer;
  }
}

class FakeEmployeesService {
  async findById(): Promise<Employee> {
    return ADMIN_EMPLOYEE;
  }
}

class FakePointsService {
  readonly calls: AjustarInput[] = [];
  failWith: Error | null = null;

  async ajustar(input: AjustarInput): Promise<AjustarResult> {
    this.calls.push(input);
    if (this.failWith) throw this.failWith;
    const signed = input.direction === 'ADD' ? input.points : -input.points;
    return {
      balanceBefore: -350,
      balanceAfter: -350 + signed,
      movement: {
        id: 88,
        createdAt: new Date('2026-10-16T18:12:00.000Z'),
        points: signed,
        balanceAfter: -350 + signed,
        reason: input.reason,
        performedBy: input.performedBy,
      },
    };
  }
}

const ACTIVE_CUSTOMER = Customer.reconstruct({
  id: 101,
  firstName: 'Martín',
  lastName: 'Gómez',
  documentType: 'DNI',
  documentNumber: '41987654',
  email: 'martin@example.com',
  active: true,
});

const INACTIVE_CUSTOMER = Customer.reconstruct({
  id: 102,
  firstName: 'Lucas',
  lastName: 'Gómez',
  documentType: 'DNI',
  documentNumber: '30111222',
  email: 'lucas@example.com',
  active: false,
});

const ADMIN_EMPLOYEE = Employee.reconstruct({
  id: 9,
  firstName: 'Valeria',
  lastName: 'Vitto',
  email: 'valeria@vitto.club',
  role: 'ADMIN',
  phone: null,
  active: true,
});

const INPUT = {
  customerId: 101,
  direction: 'ADD' as const,
  points: 350,
  reason: 'Regularización por anulación de consumo',
  performedBy: { accountId: 19, employeeId: 9 },
};

describe('CustomerPointsAdjustmentService (US-24)', () => {
  let pointsService: FakePointsService;
  let transactionRunner: PassthroughTransactionRunner;
  let service: CustomerPointsAdjustmentService;

  beforeEach(() => {
    const customersService = new FakeCustomersService();
    customersService.seed(ACTIVE_CUSTOMER);
    customersService.seed(INACTIVE_CUSTOMER);
    pointsService = new FakePointsService();
    transactionRunner = new PassthroughTransactionRunner();
    service = new CustomerPointsAdjustmentService(
      customersService as unknown as CustomersService,
      new FakeEmployeesService() as unknown as EmployeesService,
      pointsService as unknown as PointsService,
      transactionRunner,
    );
  });

  it('ajusta con el nombre del empleado y devuelve el resultado y el cliente, en una transacción', async () => {
    const result = await service.adjust(INPUT);

    expect(pointsService.calls).toEqual([
      {
        customerId: 101,
        direction: 'ADD',
        points: 350,
        reason: 'Regularización por anulación de consumo',
        performedBy: { accountId: 19, name: 'Valeria Vitto' },
      },
    ]);
    expect(result).toMatchObject({ balanceBefore: -350, balanceAfter: 0, customer: ACTIVE_CUSTOMER });
    expect(transactionRunner.runs).toBe(1);
  });

  it('cliente inexistente: 404 y no ajusta', async () => {
    await expect(service.adjust({ ...INPUT, customerId: 999 })).rejects.toBeInstanceOf(NotFoundException);
    expect(pointsService.calls).toHaveLength(0);
  });

  it('cliente dado de baja: 409 CUSTOMER_INACTIVE y no ajusta', async () => {
    const error = await service.adjust({ ...INPUT, customerId: 102 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({
      message: 'El cliente está dado de baja.',
      code: 'CUSTOMER_INACTIVE',
    });
    expect(pointsService.calls).toHaveLength(0);
  });

  it('restar más que el saldo: 409 INSUFFICIENT_BALANCE con el texto del contrato', async () => {
    pointsService.failWith = new InsufficientBalanceError();

    const error = await service.adjust({ ...INPUT, direction: 'SUBTRACT' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual({
      message: 'No se puede restar más que el saldo disponible.',
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('otro error de puntos sigue de largo sin convertirse', async () => {
    const boom = new Error('db down');
    pointsService.failWith = boom;

    await expect(service.adjust(INPUT)).rejects.toBe(boom);
  });
});
