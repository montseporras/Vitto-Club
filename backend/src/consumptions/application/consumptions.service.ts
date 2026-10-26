import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/application/audit.service.js';
import {
  consumptionRegisteredEntry,
  consumptionVoidedEntry,
  type AffectedCustomerSnapshot,
} from '../../audit/domain/audit-entries.js';
import { Consumption, ConsumptionStatus, ConsumptionViewerRole } from '../domain/consumption.js';
import { calculateConsumptionPoints, FirstConsumptionBonus } from '../domain/calculate-consumption-points.js';
import { DomainError } from '../domain/errors/domain.error.js';
import { ConsumptionRepository } from '../domain/port/consumption.repository.js';
import type { ConsumptionCustomer, ConsumptionTotals } from '../domain/port/consumption.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { CustomersService } from '../../customers/application/customers.service.js';
import { Customer } from '../../customers/domain/customer.js';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { LoyaltyService } from '../../loyalty/application/loyalty.service.js';
import { LoyaltyProgramConfiguration } from '../../loyalty/domain/loyalty-program-configuration.js';
import { Level } from '../../points/domain/level.js';
import { DomainError as PointsDomainError } from '../../points/domain/errors/domain.error.js';
import { buildMovementDateRange, parseCustomerSearch } from '../../points/domain/movement-filters.js';
import type { CustomerSearch, MovementDateRange } from '../../points/domain/movement-filters.js';
import { PointsService } from '../../points/application/points.service.js';

export type PreviewInput = { customerId: number; amount: number };

export type PreviewResult = {
  customerId: number;
  amount: number;
  points: number;
  bonusPoints: number;
  totalPoints: number;
  isFirstConsumption: boolean;
  balanceBefore: number;
  balanceAfter: number;
  equivalence: { baseAmount: number; pointsAwarded: number; configurationVersion: number };
  firstConsumptionBonus: FirstConsumptionBonus | null;
};

export type RegisterInput = {
  customerId: number;
  amount: number;
  notes?: string | null;
  registeredBy: { accountId: number; employeeId: number };
};

export type RegisterResult = {
  consumption: Consumption;
  balanceBefore: number;
  balanceAfter: number;
  levelBefore: Level;
  levelAfter: Level;
  levelUp: boolean;
};

export type VoidInput = {
  code: string;
  reason: string;
  actor: { accountId: number; role: ConsumptionViewerRole; employeeId: number };
};

export type VoidResult = {
  consumption: Consumption;
  balanceBefore: number;
  balanceAfter: number;
  negativeBalance: boolean;
};

export type ListByCustomerInput = {
  customerId: number;
  viewer: { role: ConsumptionViewerRole; accountId: number };
  status?: ConsumptionStatus;
  last24h?: boolean;
  page: number;
  limit: number;
};

export type ListByCustomerResult = {
  items: Consumption[];
  total: number;
  page: number;
  limit: number;
};

export type ListAllInput = {
  fromDate?: string;
  toDate?: string;
  q?: string;
  status?: ConsumptionStatus;
  registeredByAccountId?: number;
  customerId?: number;
  page: number;
  limit: number;
};

export type ListAllResult = {
  items: { consumption: Consumption; customer: ConsumptionCustomer }[];
  total: number;
  page: number;
  limit: number;
  totals: ConsumptionTotals;
};

export type ListMineInput = {
  customerId: number;
  status?: ConsumptionStatus;
  page: number;
  limit: number;
};

// US-21/US-22. Orquesta consumptions + points (BASE) y la auditoría (CONSUMPTION_REGISTERED/
// CONSUMPTION_VOIDED, §3.9.3) dentro de la misma transacción ambiente: si la auditoría falla,
// se deshace también el consumo (§3.9.1, regla 7).
@Injectable()
export class ConsumptionsService {
  constructor(
    private readonly consumptionsRepository: ConsumptionRepository,
    private readonly customersService: CustomersService,
    private readonly employeesService: EmployeesService,
    private readonly loyaltyService: LoyaltyService,
    private readonly pointsService: PointsService,
    private readonly auditService: AuditService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // CA-21.1: vista previa. Nunca escribe nada.
  async preview(input: PreviewInput): Promise<PreviewResult> {
    const customer = await this.customersService.findById(input.customerId);
    this.assertCustomerActive(customer);

    const config = await this.requireEquivalence();
    const bonus = this.resolveBonus(config);
    const isFirstConsumption = !(await this.consumptionsRepository.existsRegisteredByCustomerId(
      input.customerId,
    ));
    const { points, bonusPoints, totalPoints } = calculateConsumptionPoints(
      input.amount,
      { baseAmount: config.getBaseAmount() as number, pointsAwarded: config.getPointsAwarded() as number },
      bonus,
      isFirstConsumption,
    );

    const summary = await this.pointsService.resumen(input.customerId);

    return {
      customerId: input.customerId,
      amount: input.amount,
      points,
      bonusPoints,
      totalPoints,
      isFirstConsumption,
      balanceBefore: summary.balance,
      balanceAfter: summary.balance + totalPoints,
      equivalence: {
        baseAmount: config.getBaseAmount() as number,
        pointsAwarded: config.getPointsAwarded() as number,
        configurationVersion: config.getVersion(),
      },
      firstConsumptionBonus: bonus,
    };
  }

  // §3.2.1, CA-22.1/CA-22.2: el Cajero siempre ve solo las últimas 24 hs, aunque mande
  // last24h=false o no lo mande. El Administrador, por defecto, ve todo.
  async listByCustomer(input: ListByCustomerInput): Promise<ListByCustomerResult> {
    await this.customersService.findById(input.customerId); // 404 si no existe

    const effectiveLast24h = input.viewer.role === 'CASHIER' ? true : (input.last24h ?? false);

    const { items, total } = await this.consumptionsRepository.findByCustomerId(input.customerId, {
      last24h: effectiveLast24h,
      status: input.status,
      page: input.page,
      limit: input.limit,
    });

    return { items, total, page: input.page, limit: input.limit };
  }

  // US-23, §3.3.1 (CA-23.2, CA-23.3): listado del Administrador con filtros y totales
  async listAll(input: ListAllInput): Promise<ListAllResult> {
    const { range, search } = this.parseListFilters(input);

    const { items, total, totals } = await this.consumptionsRepository.findAll({
      customerId: input.customerId,
      search,
      status: input.status,
      registeredByAccountId: input.registeredByAccountId,
      ...range,
      page: input.page,
      limit: input.limit,
    });

    return { items, total, page: input.page, limit: input.limit, totals };
  }

  // US-23, §3.3.2 (CA-23.5, CA-23.6): detalle por código visible
  async getByCode(code: string): Promise<Consumption> {
    if (Consumption.parseCode(code) === null) {
      throw new BadRequestException(`El código ${code} no tiene un formato válido.`);
    }

    const consumption = await this.consumptionsRepository.findByCode(code);
    if (!consumption) {
      throw new NotFoundException(`No existe el consumo ${code}.`);
    }
    return consumption;
  }

  // US-23, §3.10.2 (CA-23.7, CA-23.8): historial del Cliente. Mismos filtros que
  // /customers/:id/consumos, sin last24h: ve todos sus consumos.
  async listMine(input: ListMineInput): Promise<ListByCustomerResult> {
    const { items, total } = await this.consumptionsRepository.findByCustomerId(input.customerId, {
      last24h: false,
      status: input.status,
      page: input.page,
      limit: input.limit,
    });

    return { items, total, page: input.page, limit: input.limit };
  }

  // Las reglas de fechas y de q son las de points (mismos mensajes que Movimientos de puntos).
  // Su DomainError es otra clase: se pasa al de consumptions para que el filtro responda 400.
  private parseListFilters(input: ListAllInput): { range: MovementDateRange; search?: CustomerSearch } {
    try {
      return {
        range: buildMovementDateRange(input.fromDate, input.toDate),
        search: input.q !== undefined ? parseCustomerSearch(input.q) : undefined,
      };
    } catch (error) {
      if (error instanceof PointsDomainError) {
        throw new DomainError(error.message, error.field);
      }
      throw error;
    }
  }

  // CA-21.5: registrar, en una sola transacción. El servidor decide fecha/puntos/
  // responsable/equivalencia (CA-21.6): nada de eso lo recibe este método del DTO.
  async register(input: RegisterInput): Promise<RegisterResult> {
    return await this.transactionRunner.run(async () => {
      const customer = await this.customersService.findById(input.customerId);
      this.assertCustomerActive(customer);

      const config = await this.requireEquivalence();
      const bonus = this.resolveBonus(config);
      const isFirstConsumption = !(await this.consumptionsRepository.existsRegisteredByCustomerId(
        input.customerId,
      ));
      const { points, bonusPoints, totalPoints } = calculateConsumptionPoints(
        input.amount,
        { baseAmount: config.getBaseAmount() as number, pointsAwarded: config.getPointsAwarded() as number },
        bonus,
        isFirstConsumption,
      );

      const employee = await this.employeesService.findById(input.registeredBy.employeeId);
      const registeredByName = `${employee.getFirstName()} ${employee.getLastName()}`;

      const consumption = Consumption.create({
        customerId: input.customerId,
        amount: input.amount,
        notes: input.notes,
        points,
        bonusPoints,
        configurationVersion: config.getVersion(),
        baseAmount: config.getBaseAmount() as number,
        pointsAwarded: config.getPointsAwarded() as number,
        registeredByAccountId: input.registeredBy.accountId,
        registeredByName,
      });
      const saved = await this.consumptionsRepository.save(consumption);

      const credit = await this.pointsService.acreditar({
        customerId: input.customerId,
        points: totalPoints,
        consumptionId: saved.getId() as number,
        performedBy: { accountId: input.registeredBy.accountId, name: registeredByName },
      });

      // CA-21.5: el actor es el empleado que registra (§3.9.1, regla 3)
      await this.auditService.record(
        consumptionRegisteredEntry(
          { type: 'EMPLOYEE', accountId: input.registeredBy.accountId },
          toAffectedCustomer(customer),
          {
            code: saved.getCode() as string,
            amount: saved.getAmount(),
            baseAmount: saved.getBaseAmount(),
            pointsAwarded: saved.getPointsAwarded(),
            totalPoints: saved.getTotalPoints(),
            bonusPoints: saved.getBonusPoints(),
            balanceAfter: credit.balanceAfter,
          },
        ),
      );

      return {
        consumption: saved,
        balanceBefore: credit.balanceBefore,
        balanceAfter: credit.balanceAfter,
        levelBefore: credit.levelBefore,
        levelAfter: credit.levelAfter,
        levelUp: credit.levelBefore !== credit.levelAfter,
      };
    });
  }

  // CA-22.4 a CA-22.9: anular. El orden de chequeos importa: "ya anulado" (409) se evalúa
  // antes que el permiso (403), para que un Administrador que reintenta anular algo que ya
  // está VOIDED reciba 409, no un falso 403.
  async anular(input: VoidInput): Promise<VoidResult> {
    return await this.transactionRunner.run(async () => {
      const id = Consumption.parseCode(input.code);
      if (id === null) {
        throw new BadRequestException(`Invalid consumption code format: ${input.code}`);
      }

      const consumption = await this.consumptionsRepository.findByCode(input.code);
      if (!consumption) {
        throw new NotFoundException(`No existe el consumo ${input.code}.`);
      }

      if (consumption.isVoided()) {
        throw new ConflictException({
          message: 'Este consumo ya está anulado.',
          code: 'CONSUMPTION_ALREADY_VOIDED',
        });
      }

      const eligibility = consumption.getVoidEligibility({
        role: input.actor.role,
        accountId: input.actor.accountId,
      });
      if (!eligibility.canVoid) {
        throw new ForbiddenException({
          message: 'Solo podés anular consumos propios dentro de las 24 hs.',
          code: 'VOID_NOT_ALLOWED',
        });
      }

      const employee = await this.employeesService.findById(input.actor.employeeId);
      const voidedByName = `${employee.getFirstName()} ${employee.getLastName()}`;

      consumption.void({
        voidedByAccountId: input.actor.accountId,
        voidedByName,
        reason: input.reason,
      });
      await this.consumptionsRepository.updateVoidStatus(consumption);

      const reversal = await this.pointsService.revertir({
        customerId: consumption.getCustomerId(),
        consumptionId: consumption.getId() as number,
        totalPoints: consumption.getTotalPoints(),
        performedBy: { accountId: input.actor.accountId, name: voidedByName },
      });

      // CA-22.7: el actor es el empleado que anula. El cliente se lee para el bloque
      // "Cliente afectado" (foto del momento, §3.9.1 regla 8).
      const customer = await this.customersService.findById(consumption.getCustomerId());
      await this.auditService.record(
        consumptionVoidedEntry({ type: 'EMPLOYEE', accountId: input.actor.accountId }, toAffectedCustomer(customer), {
          code: input.code,
          amount: consumption.getAmount(),
          totalPoints: consumption.getTotalPoints(),
          balanceAfter: reversal.balanceAfter,
          reason: consumption.getVoidedReason() as string,
        }),
      );

      return {
        consumption,
        balanceBefore: reversal.balanceBefore,
        balanceAfter: reversal.balanceAfter,
        negativeBalance: reversal.balanceAfter < 0,
      };
    });
  }

  private assertCustomerActive(customer: Customer): void {
    if (!customer.isActive()) {
      throw new ConflictException({
        message: 'El cliente está dado de baja. No se pueden registrar consumos.',
        code: 'CUSTOMER_INACTIVE',
      });
    }
  }

  private resolveBonus(config: LoyaltyProgramConfiguration): FirstConsumptionBonus | null {
    const bonusType = config.getBonusType();
    const bonusValue = config.getBonusValue();
    if (bonusType === null || bonusValue === null) return null;
    return { bonusType, bonusValue };
  }

  // CA-21.12: sin equivalencia configurada, 409. La fila existe siempre (hay una versión
  // activa), pero baseAmount/pointsAwarded pueden estar sin configurar (null).
  private async requireEquivalence(): Promise<LoyaltyProgramConfiguration> {
    const config = await this.loyaltyService.getActiveConfiguration();
    if (config.getBaseAmount() === null || config.getPointsAwarded() === null) {
      throw new ConflictException({
        message: 'Todavía no se configuró la equivalencia de puntos. Pedíselo a un administrador.',
        code: 'POINTS_EQUIVALENCE_NOT_CONFIGURED',
      });
    }
    return config;
  }
}

// Lo mínimo del cliente para el bloque "Cliente afectado" de la auditoría
function toAffectedCustomer(customer: Customer): AffectedCustomerSnapshot {
  return {
    id: customer.getId() as number,
    firstName: customer.getFirstName(),
    lastName: customer.getLastName(),
    documentType: customer.getDocumentType(),
    documentNumber: customer.getDocumentNumber(),
  };
}
