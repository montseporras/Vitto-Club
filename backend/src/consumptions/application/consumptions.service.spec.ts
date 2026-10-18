import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsumptionsService } from './consumptions.service.js';
import { Consumption } from '../domain/consumption.js';
import {
  ConsumptionRepository,
  FindByCustomerIdFilters,
  FindByCustomerIdResult,
} from '../domain/port/consumption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { Customer } from '../../customers/domain/customer.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Employee } from '../../employees/domain/employee.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { LoyaltyProgramConfiguration } from '../../loyalty/domain/loyalty-program-configuration.js';
import { LoyaltyService } from '../../loyalty/application/loyalty.service.js';
import { PointsService, AcreditarInput, AcreditarResult, RevertirInput, BalanceMutationResult, PointsSummary } from '../../points/application/points.service.js';

// --- Fakes en memoria, mismo criterio que el resto del repo. ---

class FakeConsumptionRepository implements ConsumptionRepository {
  readonly items = new Map<number, Consumption>();
  private nextId = 1;

  async save(consumption: Consumption): Promise<Consumption> {
    const id = this.nextId++;
    const saved = Consumption.reconstruct({
      id,
      customerId: consumption.getCustomerId(),
      amount: consumption.getAmount(),
      notes: consumption.getNotes(),
      points: consumption.getPoints(),
      bonusPoints: consumption.getBonusPoints(),
      configurationVersion: consumption.getConfigurationVersion(),
      baseAmount: consumption.getBaseAmount(),
      pointsAwarded: consumption.getPointsAwarded(),
      registeredByAccountId: consumption.getRegisteredByAccountId(),
      registeredByName: consumption.getRegisteredByName(),
      status: consumption.getStatus(),
      createdAt: consumption.getCreatedAt(),
    });
    this.items.set(id, saved);
    return saved;
  }

  async findByCode(code: string): Promise<Consumption | null> {
    const id = Consumption.parseCode(code);
    if (id === null) return null;
    return this.items.get(id) ?? null;
  }

  async existsRegisteredByCustomerId(customerId: number): Promise<boolean> {
    return [...this.items.values()].some(
      (c) => c.getCustomerId() === customerId && c.isRegistered(),
    );
  }

  async updateVoidStatus(consumption: Consumption): Promise<void> {
    this.items.set(consumption.getId() as number, consumption);
  }

  async findByCustomerId(
    customerId: number,
    filters: FindByCustomerIdFilters,
  ): Promise<FindByCustomerIdResult> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const matching = [...this.items.values()]
      .filter((c) => c.getCustomerId() === customerId)
      .filter((c) => !filters.status || c.getStatus() === filters.status)
      .filter((c) => !filters.last24h || c.getCreatedAt().getTime() >= cutoff)
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());

    const start = (filters.page - 1) * filters.limit;
    return { items: matching.slice(start, start + filters.limit), total: matching.length };
  }
}

class PassthroughTransactionRunner implements TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
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
  private readonly employees = new Map<number, Employee>();

  seed(employee: Employee): void {
    this.employees.set(employee.getId() as number, employee);
  }

  async findById(id: number): Promise<Employee> {
    const employee = this.employees.get(id);
    if (!employee) throw new NotFoundException(`Employee with ID ${id} not found`);
    return employee;
  }
}

class FakeLoyaltyService {
  config: LoyaltyProgramConfiguration = LoyaltyProgramConfiguration.define({
    version: 4,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    isActive: true,
    validFrom: new Date('2026-01-01T00:00:00.000Z'),
    validTo: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  async getActiveConfiguration(): Promise<LoyaltyProgramConfiguration> {
    return this.config;
  }
}

class FakePointsService {
  readonly acreditarCalls: AcreditarInput[] = [];
  readonly revertirCalls: RevertirInput[] = [];
  resumenBalance = 0;

  async acreditar(input: AcreditarInput): Promise<AcreditarResult> {
    this.acreditarCalls.push(input);
    return {
      balanceBefore: this.resumenBalance,
      balanceAfter: this.resumenBalance + input.points,
      lifetimePointsBefore: this.resumenBalance,
      lifetimePointsAfter: this.resumenBalance + input.points,
      levelBefore: 'BRONZE',
      levelAfter: input.points >= 300 ? 'SILVER' : 'BRONZE',
    };
  }

  async revertir(input: RevertirInput): Promise<BalanceMutationResult> {
    this.revertirCalls.push(input);
    return {
      balanceBefore: input.totalPoints,
      balanceAfter: 0,
      lifetimePointsBefore: input.totalPoints,
      lifetimePointsAfter: 0,
    };
  }

  async resumen(customerId: number): Promise<PointsSummary> {
    return {
      customerId,
      balance: this.resumenBalance,
      negativeBalance: this.resumenBalance < 0,
      lifetimePoints: this.resumenBalance,
      level: { current: 'BRONZE', next: 'SILVER', currentMinPoints: 0, nextMinPoints: 300, pointsToNext: 300, progressPercent: 0 },
      nextExpirations: [],
    };
  }
}

const ACTIVE_CUSTOMER = Customer.reconstruct({
  id: 101,
  firstName: 'Carolina',
  lastName: 'Fernández',
  documentType: 'DNI',
  documentNumber: '38456123',
  email: 'carolina@example.com',
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

const CASHIER_EMPLOYEE = Employee.reconstruct({
  id: 12,
  firstName: 'Ana',
  lastName: 'Pereyra',
  email: 'ana.pereyra@vitto.club',
  role: 'CASHIER',
  phone: null,
  active: true,
});

describe('ConsumptionsService', () => {
  let repository: FakeConsumptionRepository;
  let customersService: FakeCustomersService;
  let employeesService: FakeEmployeesService;
  let loyaltyService: FakeLoyaltyService;
  let pointsService: FakePointsService;
  let service: ConsumptionsService;

  beforeEach(() => {
    repository = new FakeConsumptionRepository();
    customersService = new FakeCustomersService();
    customersService.seed(ACTIVE_CUSTOMER);
    customersService.seed(INACTIVE_CUSTOMER);
    employeesService = new FakeEmployeesService();
    employeesService.seed(CASHIER_EMPLOYEE);
    loyaltyService = new FakeLoyaltyService();
    pointsService = new FakePointsService();

    service = new ConsumptionsService(
      repository,
      customersService as unknown as CustomersService,
      employeesService as unknown as EmployeesService,
      loyaltyService as unknown as LoyaltyService,
      pointsService as unknown as PointsService,
      new PassthroughTransactionRunner(),
    );
  });

  describe('preview (CA-21.1)', () => {
    it('calcula los puntos con la equivalencia vigente y el saldo actual', async () => {
      const result = await service.preview({ customerId: 101, amount: 1550 });

      expect(result.points).toBe(15);
      expect(result.bonusPoints).toBe(0);
      expect(result.totalPoints).toBe(15);
      expect(result.isFirstConsumption).toBe(true);
      expect(result.equivalence).toEqual({ baseAmount: 1000, pointsAwarded: 10, configurationVersion: 4 });
      expect(result.firstPurchaseBonus).toBeNull();
    });

    it('isFirstConsumption es false si el cliente ya tiene un consumo REGISTERED', async () => {
      await service.register({
        customerId: 101,
        amount: 1000,
        registeredBy: { accountId: 12, employeeId: 12 },
      });

      const result = await service.preview({ customerId: 101, amount: 1550 });

      expect(result.isFirstConsumption).toBe(false);
    });

    it('409 CUSTOMER_INACTIVE si el cliente está dado de baja', async () => {
      await expect(service.preview({ customerId: 102, amount: 1000 })).rejects.toThrow(ConflictException);
    });

    it('404 si el cliente no existe', async () => {
      await expect(service.preview({ customerId: 999, amount: 1000 })).rejects.toThrow(NotFoundException);
    });

    it('409 POINTS_EQUIVALENCE_NOT_CONFIGURED si no hay equivalencia configurada', async () => {
      loyaltyService.config = LoyaltyProgramConfiguration.define({
        version: 1,
        baseAmount: null,
        pointsAwarded: null,
        pointsExpirationMonths: 12,
        bonusType: null,
        bonusValue: null,
        isActive: true,
        validFrom: new Date(),
        validTo: null,
        createdAt: new Date(),
      });

      await expect(service.preview({ customerId: 101, amount: 1000 })).rejects.toThrow(ConflictException);
    });
  });

  describe('listByCustomer (§3.2.1, CA-22.1/CA-22.2)', () => {
    it('Administrador: last24h por defecto false (no filtra por fecha)', async () => {
      await service.register({ customerId: 101, amount: 50000, registeredBy: { accountId: 12, employeeId: 12 } });

      const result = await service.listByCustomer({
        customerId: 101,
        viewer: { role: 'ADMIN', accountId: 999 },
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('Cajero: se fuerza last24h=true aunque mande false', async () => {
      await service.register({ customerId: 101, amount: 50000, registeredBy: { accountId: 12, employeeId: 12 } });
      // Simulo un consumo viejo (fuera de las 24 hs) directamente en el repo fake.
      const old = Consumption.reconstruct({
        id: 999,
        customerId: 101,
        amount: 1000,
        notes: null,
        points: 10,
        bonusPoints: 0,
        configurationVersion: 4,
        baseAmount: 1000,
        pointsAwarded: 10,
        registeredByAccountId: 12,
        registeredByName: 'Ana Pereyra',
        status: 'REGISTERED',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      });
      repository.items.set(999, old);

      const result = await service.listByCustomer({
        customerId: 101,
        viewer: { role: 'CASHIER', accountId: 12 },
        last24h: false, // el service lo ignora para Cajero
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(1); // solo el de hace un momento, no el viejo
    });

    it('404 si el cliente no existe', async () => {
      await expect(
        service.listByCustomer({ customerId: 999, viewer: { role: 'ADMIN', accountId: 1 }, page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('register (CA-21.5)', () => {
    it('crea el consumo, acredita los puntos vía PointsService y devuelve la forma esperada', async () => {
      const result = await service.register({
        customerId: 101,
        amount: 50000,
        notes: 'Mesa 4',
        registeredBy: { accountId: 12, employeeId: 12 },
      });

      expect(result.consumption.getStatus()).toBe('REGISTERED');
      expect(result.consumption.getTotalPoints()).toBe(500);
      expect(result.consumption.getNotes()).toBe('Mesa 4');
      expect(result.consumption.getRegisteredByName()).toBe('Ana Pereyra');
      expect(pointsService.acreditarCalls).toEqual([
        {
          customerId: 101,
          points: 500,
          consumptionId: result.consumption.getId(),
          performedBy: { accountId: 12, name: 'Ana Pereyra' },
        },
      ]);
      expect(result.balanceAfter).toBe(500);
      expect(result.levelUp).toBe(true); // BRONZE -> SILVER, según el fake de PointsService
    });

    it('409 CUSTOMER_INACTIVE: no crea el consumo ni acredita nada', async () => {
      await expect(
        service.register({ customerId: 102, amount: 50000, registeredBy: { accountId: 12, employeeId: 12 } }),
      ).rejects.toThrow(ConflictException);

      expect(repository.items.size).toBe(0);
      expect(pointsService.acreditarCalls).toHaveLength(0);
    });

    it('409 POINTS_EQUIVALENCE_NOT_CONFIGURED: no crea el consumo', async () => {
      loyaltyService.config = LoyaltyProgramConfiguration.define({
        version: 1,
        baseAmount: null,
        pointsAwarded: null,
        pointsExpirationMonths: 12,
        bonusType: null,
        bonusValue: null,
        isActive: true,
        validFrom: new Date(),
        validTo: null,
        createdAt: new Date(),
      });

      await expect(
        service.register({ customerId: 101, amount: 50000, registeredBy: { accountId: 12, employeeId: 12 } }),
      ).rejects.toThrow(ConflictException);

      expect(repository.items.size).toBe(0);
    });
  });

  describe('anular (CA-22.4 a CA-22.9)', () => {
    async function registerConsumption() {
      const result = await service.register({
        customerId: 101,
        amount: 50000,
        registeredBy: { accountId: 12, employeeId: 12 },
      });
      return result.consumption.getCode() as string;
    }

    it('Administrador anula cualquier consumo REGISTERED', async () => {
      const code = await registerConsumption();

      const result = await service.anular({
        code,
        reason: 'motivo válido',
        actor: { accountId: 999, role: 'ADMIN', employeeId: 12 },
      });

      expect(result.consumption.getStatus()).toBe('VOIDED');
      expect(pointsService.revertirCalls).toHaveLength(1);
    });

    it('Cajero anula su propio consumo', async () => {
      const code = await registerConsumption();

      const result = await service.anular({
        code,
        reason: 'motivo válido',
        actor: { accountId: 12, role: 'CASHIER', employeeId: 12 },
      });

      expect(result.consumption.getStatus()).toBe('VOIDED');
    });

    it('403 VOID_NOT_ALLOWED: Cajero intenta anular un consumo ajeno', async () => {
      const code = await registerConsumption();

      await expect(
        service.anular({
          code,
          reason: 'motivo válido',
          actor: { accountId: 999, role: 'CASHIER', employeeId: 12 },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('409 CONSUMPTION_ALREADY_VOIDED: ya estaba anulado (incluso para el Administrador)', async () => {
      const code = await registerConsumption();
      await service.anular({ code, reason: 'motivo válido', actor: { accountId: 12, role: 'CASHIER', employeeId: 12 } });

      await expect(
        service.anular({ code, reason: 'otro motivo', actor: { accountId: 999, role: 'ADMIN', employeeId: 12 } }),
      ).rejects.toThrow(ConflictException);
    });

    it('400 si el código no respeta el formato ^C-\\d{6}$', async () => {
      await expect(
        service.anular({ code: '131', reason: 'motivo válido', actor: { accountId: 12, role: 'ADMIN', employeeId: 12 } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('404 si el código no existe', async () => {
      await expect(
        service.anular({ code: 'C-999999', reason: 'motivo válido', actor: { accountId: 12, role: 'ADMIN', employeeId: 12 } }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
