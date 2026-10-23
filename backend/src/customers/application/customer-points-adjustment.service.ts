import { ConflictException, Injectable } from '@nestjs/common';
import { EmployeesService } from '../../employees/application/employees.service.js';
import { AjustarResult, PointsService } from '../../points/application/points.service.js';
import { InsufficientBalanceError } from '../../points/domain/errors/insufficient-balance.error.js';
import { Customer } from '../domain/customer.js';
import { customerInactive } from '../domain/errors/customer-inactive.error.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { CustomersService } from './customers.service.js';

export const INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE';
export const INSUFFICIENT_BALANCE_MESSAGE = 'No se puede restar más que el saldo disponible.';

export type AdjustPointsInput = {
  customerId: number;
  direction: 'ADD' | 'SUBTRACT';
  points: number;
  reason: string;
  // Sale del token: quién ajusta nunca viene en el body
  performedBy: { accountId: number; employeeId: number };
};

export type AdjustPointsResult = AjustarResult & { customer: Customer };

/**
 * Ajustar puntos (US-24, §3.5.1). La deuda, el FIFO y el lock los resuelve
 * PointsService.ajustar (BASE); acá van el cliente (404 / inactivo) y quién ajusta.
 * Todo en la transacción ambiente: si algo falla, no queda nada escrito.
 */
@Injectable()
export class CustomerPointsAdjustmentService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly employeesService: EmployeesService,
    private readonly pointsService: PointsService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async adjust(input: AdjustPointsInput): Promise<AdjustPointsResult> {
    return await this.transactionRunner.run(async () => {
      const customer = await this.customersService.findById(input.customerId); // 404 si no existe
      // §8.2: un cliente dado de baja no recibe ajustes
      if (!customer.isActive()) throw customerInactive();

      // "Realizado por" guarda el nombre del momento (foto, como en consumos)
      const employee = await this.employeesService.findById(input.performedBy.employeeId);
      const name = `${employee.getFirstName()} ${employee.getLastName()}`;

      try {
        const result = await this.pointsService.ajustar({
          customerId: input.customerId,
          direction: input.direction,
          points: input.points,
          reason: input.reason,
          performedBy: { accountId: input.performedBy.accountId, name },
        });
        return { ...result, customer };
      } catch (error) {
        // Decisión #1: restar nunca deja el saldo negativo
        if (error instanceof InsufficientBalanceError) {
          throw new ConflictException({ message: INSUFFICIENT_BALANCE_MESSAGE, code: INSUFFICIENT_BALANCE });
        }
        throw error;
      }
    });
  }
}
