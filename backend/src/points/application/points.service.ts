import { Injectable } from '@nestjs/common';
import { PointsLot } from '../domain/points-lot.js';
import { calculateLevel, Level, LevelSummary } from '../domain/level.js';
import { toArgentinaDateString } from '../../shared/time/argentina-date.js';
import { InsufficientBalanceError } from '../domain/errors/insufficient-balance.error.js';
import {
  ExpirationCustomer,
  ExpiringLot,
  InsertedMovement,
  PointsRepository,
} from '../domain/port/points.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

export type PerformedBy = { accountId: number; name: string };

// US-25: nombre con el que el Sistema figura en los movimientos (§3.6, performed_by_name)
export const SYSTEM_PERFORMER_NAME = 'Sistema';

// US-25: un lote que acaba de vencer. Se le pasa a quien orquesta el proceso, dentro de la
// misma transacción, para que escriba la auditoría POINTS_EXPIRED (§3.9.3).
export type ExpiredLot = {
  lotId: number;
  customer: ExpirationCustomer;
  // Puntos que vencieron (positivo); el movimiento EXPIRATION los registra con signo −
  points: number;
  accreditedAt: Date;
  balanceAfter: number;
};

export type ExpirationRunResult = {
  expiredLots: number;
  expiredPoints: number;
  // Lotes cuya transacción falló: quedan como estaban y se reintentan en la próxima corrida
  failures: { lotId: number; error: unknown }[];
};

export type AcreditarInput = {
  customerId: number;
  points: number;
  consumptionId: number;
  performedBy: PerformedBy;
};

// BASE-5 (contrato S5 §2.7 y §8.4, CA-B5.5). Lo usan US-31 y US-32 (MISSION_REWARD, al reclamar) y
// US-48 (BIRTHDAY_BONUS). Siempre lo hace el Sistema: el Cliente que reclama una misión nunca es actor.
export type AcreditarBonificacionInput = {
  customerId: number;
  type: 'MISSION_REWARD' | 'BIRTHDAY_BONUS';
  // Puntos de regalo, enteros y positivos
  points: number;
  // Obligatorio en MISSION_REWARD y solo ahí (CHECK points_movements_mission_check)
  customerMissionId?: number;
};

export type RevertirInput = {
  customerId: number;
  consumptionId: number;
  totalPoints: number;
  performedBy: PerformedBy;
};

export type AjustarInput = {
  customerId: number;
  direction: 'ADD' | 'SUBTRACT';
  points: number;
  reason: string;
  performedBy: PerformedBy;
};

// BASE-4 (contrato S4 §8.4, CA-B4.6). Lo usa US-42 al registrar el uso de un canje. Solo lleva
// el id del canje: la descripción "Canje: {recompensa}" y el redemptionCode del listado se
// arman al leer, desde redemptions (§3.13.2, US-42). Decisión tomada a pedido de Deni.
export type CanjearInput = {
  customerId: number;
  // Puntos del canje (snapshot de redemptions.points), positivos
  points: number;
  redemptionId: number;
  performedBy: PerformedBy;
};

export type CanjearResult = {
  balanceBefore: number;
  balanceAfter: number;
};

// US-24: el movimiento MANUAL_ADJUSTMENT que se acaba de guardar, para la respuesta 201 (§3.5.1)
export type AdjustmentMovement = {
  id: number;
  createdAt: Date;
  points: number;
  balanceAfter: number;
  reason: string;
  performedBy: PerformedBy;
};

export type AjustarResult = {
  balanceBefore: number;
  balanceAfter: number;
  movement: AdjustmentMovement;
};

export type BalanceMutationResult = {
  balanceBefore: number;
  balanceAfter: number;
  lifetimePointsBefore: number;
  lifetimePointsAfter: number;
};

// acreditar() es el único que informa el nivel antes/después (CA-21.5, §3.1.3: levelBefore/
// levelAfter/levelUp en la respuesta de POST /consumos). revertir()/ajustar() no lo
// necesitan: el contrato no los expone en esas respuestas.
export type AcreditarResult = BalanceMutationResult & {
  levelBefore: Level;
  levelAfter: Level;
};

export type PointsSummary = {
  customerId: number;
  balance: number;
  negativeBalance: boolean;
  lifetimePoints: number;
  level: LevelSummary;
  nextExpirations: { points: number; expiresAt: string }[];
};

const MAX_NEXT_EXPIRATIONS = 5;

function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

// BASE: el motor interno de puntos. consumptions, US-24 (ajustes) y US-19/US-46 (resumen)
// lo inyectan y lo usan dentro de su propia transacción ambiente — este servicio nunca
// abre un endpoint HTTP propio (§8.4).
@Injectable()
export class PointsService {
  constructor(
    private readonly pointsRepository: PointsRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // CA-BASE.3: acredita los puntos de un consumo (CONSUMPTION_CREDIT). Si hay deuda, la
  // cancela primero; lo que sobra crea un lote nuevo con la vigencia vigente.
  async acreditar(input: AcreditarInput): Promise<AcreditarResult> {
    return await this.transactionRunner.run(async () => {
      const config = await this.requireActiveConfiguration();
      const row = await this.pointsRepository.lockOrCreateBalance(input.customerId);

      const { newDebt, remainingToCredit } = this.cancelDebtFirst(row.debt, input.points);

      let lotId: number | null = null;
      if (remainingToCredit > 0) {
        const accreditedAt = new Date();
        const lot = PointsLot.create({
          customerId: input.customerId,
          consumptionId: input.consumptionId,
          initialPoints: remainingToCredit,
          accreditedAt,
          expiresAt: addMonthsUTC(accreditedAt, config.pointsExpirationMonths),
        });
        const created = await this.pointsRepository.createLot(lot);
        lotId = created.getId();
      }

      const newBalance = row.balance + input.points;
      const newLifetimePoints = row.lifetimePoints + input.points;

      await this.pointsRepository.updateBalance(input.customerId, {
        balance: newBalance,
        debt: newDebt,
        lifetimePoints: newLifetimePoints,
      });

      // D-07 (opción a, decisión tomada a pedido de Montse): un consumo que da 0 puntos se registra
      // igual, pero no deja movimiento. El contrato S3 §3.12 pide `points <> 0` en los movimientos.
      if (input.points !== 0) {
        await this.pointsRepository.insertMovement({
          customerId: input.customerId,
          type: 'CONSUMPTION_CREDIT',
          points: input.points,
          balanceAfter: newBalance,
          consumptionId: input.consumptionId,
          lotId,
          performedByAccountId: input.performedBy.accountId,
          performedByName: input.performedBy.name,
        });
      }

      const levelBefore = calculateLevel(row.lifetimePoints, config.silverMinPoints, config.goldMinPoints).current;
      const levelAfter = calculateLevel(newLifetimePoints, config.silverMinPoints, config.goldMinPoints).current;

      return {
        balanceBefore: row.balance,
        balanceAfter: newBalance,
        lifetimePointsBefore: row.lifetimePoints,
        lifetimePointsAfter: newLifetimePoints,
        levelBefore,
        levelAfter,
      };
    });
  }

  // CA-B5.5: acredita puntos de regalo (MISSION_REWARD o BIRTHDAY_BONUS). Igual que acreditar():
  // cancela primero la deuda y lo que sobra crea un lote con la vigencia vigente. A diferencia de un
  // consumo, NO suma a lifetimePoints: el nivel sale solo de los consumos (S5-9, §2.7). El lote no
  // pertenece a ningún consumo. El movimiento queda a nombre del Sistema.
  async acreditarBonificacion(input: AcreditarBonificacionInput): Promise<BalanceMutationResult> {
    // Sin período no hay nada que controlar: siempre acredita
    return (await this.grantBonus(input)) as BalanceMutationResult;
  }

  // US-48 (CA-48.5, contrato S5 §3.8.2): igual que acreditarBonificacion, pero solo si en ese período el cliente todavía
  // no tiene un movimiento de ese tipo (el regalo de cumpleaños es una vez por año). La revisión y el regalo van en la
  // misma transacción y bajo el bloqueo del saldo del cliente: dos corridas a la vez no regalan dos veces. Devuelve
  // null, sin acreditar nada, si ya se había regalado en ese período.
  async acreditarBonificacionUnaVez(
    input: AcreditarBonificacionInput,
    period: { from: Date; to: Date },
  ): Promise<BalanceMutationResult | null> {
    return await this.grantBonus(input, period);
  }

  private async grantBonus(
    input: AcreditarBonificacionInput,
    period?: { from: Date; to: Date },
  ): Promise<BalanceMutationResult | null> {
    if (!Number.isInteger(input.points) || input.points <= 0) {
      throw new Error(`Gift points must be a positive integer (got ${input.points})`);
    }
    if ((input.type === 'MISSION_REWARD') !== (input.customerMissionId !== undefined)) {
      throw new Error('customerMissionId is required for MISSION_REWARD and only for it');
    }

    return await this.transactionRunner.run(async () => {
      const config = await this.requireActiveConfiguration();
      const row = await this.pointsRepository.lockOrCreateBalance(input.customerId);
      if (
        period &&
        (await this.pointsRepository.existsMovementBetween(input.customerId, input.type, period.from, period.to))
      ) {
        return null;
      }

      const { newDebt, remainingToCredit } = this.cancelDebtFirst(row.debt, input.points);

      let lotId: number | null = null;
      if (remainingToCredit > 0) {
        const accreditedAt = new Date();
        const lot = PointsLot.create({
          customerId: input.customerId,
          consumptionId: null,
          initialPoints: remainingToCredit,
          accreditedAt,
          expiresAt: addMonthsUTC(accreditedAt, config.pointsExpirationMonths),
        });
        const created = await this.pointsRepository.createLot(lot);
        lotId = created.getId();
      }

      const newBalance = row.balance + input.points;
      await this.pointsRepository.updateBalance(input.customerId, {
        balance: newBalance,
        debt: newDebt,
        lifetimePoints: row.lifetimePoints,
      });

      await this.pointsRepository.insertMovement({
        customerId: input.customerId,
        type: input.type,
        points: input.points,
        balanceAfter: newBalance,
        consumptionId: null,
        lotId,
        customerMissionId: input.customerMissionId ?? null,
        performedByAccountId: null,
        performedByName: SYSTEM_PERFORMER_NAME,
      });

      return {
        balanceBefore: row.balance,
        balanceAfter: newBalance,
        lifetimePointsBefore: row.lifetimePoints,
        lifetimePointsAfter: row.lifetimePoints,
      };
    });
  }

  // US-47 (contrato S5 §3.8.1): los lotes ACTIVE con saldo, de clientes activos, que vencen entre ahora y dentro de
  // `days` días (7 × 24 horas: S5-17), del que vence antes al que vence después. Lo usa el aviso de vencimiento de
  // puntos: `notifications` depende de `points` para esto, nunca al revés.
  async lotesPorVencer(now: Date, days = 7): Promise<ExpiringLot[]> {
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return await this.pointsRepository.findLotsExpiringBetween(now, until);
  }

  // CA-BASE.4: revierte todos los puntos de un consumo anulado (VOID_REVERSAL). Del lote
  // de ese consumo se descuenta lo que quede disponible y el lote se invalida entero; lo
  // que ya se había gastado se convierte en deuda (el saldo puede quedar negativo).
  async revertir(input: RevertirInput): Promise<BalanceMutationResult> {
    return await this.transactionRunner.run(async () => {
      const row = await this.pointsRepository.lockOrCreateBalance(input.customerId);
      const lot = await this.pointsRepository.findLotByConsumptionId(input.consumptionId);

      const remaining = lot ? lot.getRemainingPoints() : 0;
      const deducted = Math.min(remaining, input.totalPoints);
      const shortfall = input.totalPoints - deducted;

      if (lot) {
        lot.voidOrigin(deducted);
        await this.pointsRepository.updateLot(lot);
      }

      const newBalance = row.balance - input.totalPoints;
      const newDebt = row.debt + shortfall;
      const newLifetimePoints = row.lifetimePoints - input.totalPoints;

      await this.pointsRepository.updateBalance(input.customerId, {
        balance: newBalance,
        debt: newDebt,
        lifetimePoints: newLifetimePoints,
      });

      // D-07 (opción a): anular un consumo de 0 puntos tampoco deja movimiento (no hay nada que revertir)
      if (input.totalPoints !== 0) {
        await this.pointsRepository.insertMovement({
          customerId: input.customerId,
          type: 'VOID_REVERSAL',
          points: -input.totalPoints,
          balanceAfter: newBalance,
          consumptionId: input.consumptionId,
          lotId: lot ? lot.getId() : null,
          performedByAccountId: input.performedBy.accountId,
          performedByName: input.performedBy.name,
        });
      }

      return {
        balanceBefore: row.balance,
        balanceAfter: newBalance,
        lifetimePointsBefore: row.lifetimePoints,
        lifetimePointsAfter: newLifetimePoints,
      };
    });
  }

  // CA-BASE.5 (US-24, Ajustar puntos — este método ya queda disponible, aunque el
  // controller/DTO de esa historia no es mío). ADD cancela deuda primero y crea lote con
  // lo que sobra. SUBTRACT descuenta de los lotes ACTIVE en orden de vencimiento (FIFO);
  // si points supera el saldo (o el saldo ya es negativo), tira InsufficientBalanceError.
  // Nunca toca lifetimePoints: el ajuste no cambia el nivel (CA-BASE.7).
  async ajustar(input: AjustarInput): Promise<AjustarResult> {
    return await this.transactionRunner.run(async () => {
      const row = await this.pointsRepository.lockOrCreateBalance(input.customerId);

      if (input.direction === 'ADD') {
        return await this.ajustarAdd(input, row);
      }
      return await this.ajustarSubtract(input, row);
    });
  }

  private async ajustarAdd(
    input: AjustarInput,
    row: { customerId: number; balance: number; debt: number; lifetimePoints: number },
  ): Promise<AjustarResult> {
    const config = await this.requireActiveConfiguration();
    const { newDebt, remainingToCredit } = this.cancelDebtFirst(row.debt, input.points);

    let lotId: number | null = null;
    if (remainingToCredit > 0) {
      const accreditedAt = new Date();
      const lot = PointsLot.create({
        customerId: input.customerId,
        consumptionId: null,
        initialPoints: remainingToCredit,
        accreditedAt,
        expiresAt: addMonthsUTC(accreditedAt, config.pointsExpirationMonths),
      });
      const created = await this.pointsRepository.createLot(lot);
      lotId = created.getId();
    }

    const newBalance = row.balance + input.points;
    await this.pointsRepository.updateBalance(input.customerId, {
      balance: newBalance,
      debt: newDebt,
      lifetimePoints: row.lifetimePoints,
    });
    const inserted = await this.pointsRepository.insertMovement({
      customerId: input.customerId,
      type: 'MANUAL_ADJUSTMENT',
      points: input.points,
      balanceAfter: newBalance,
      consumptionId: null,
      lotId,
      reason: input.reason,
      performedByAccountId: input.performedBy.accountId,
      performedByName: input.performedBy.name,
    });

    return this.adjustmentResult(input, row.balance, newBalance, input.points, inserted);
  }

  private async ajustarSubtract(
    input: AjustarInput,
    row: { customerId: number; balance: number; debt: number; lifetimePoints: number },
  ): Promise<AjustarResult> {
    if (input.points > row.balance) {
      throw new InsufficientBalanceError();
    }

    const lots = await this.pointsRepository.findActiveLotsByCustomerId(input.customerId);
    let remainingToSubtract = input.points;
    for (const lot of lots) {
      if (remainingToSubtract === 0) break;
      const take = Math.min(lot.getRemainingPoints(), remainingToSubtract);
      if (take > 0) {
        lot.consume(take);
        await this.pointsRepository.updateLot(lot);
        remainingToSubtract -= take;
      }
    }

    const newBalance = row.balance - input.points;
    await this.pointsRepository.updateBalance(input.customerId, {
      balance: newBalance,
      debt: row.debt,
      lifetimePoints: row.lifetimePoints,
    });
    const inserted = await this.pointsRepository.insertMovement({
      customerId: input.customerId,
      type: 'MANUAL_ADJUSTMENT',
      points: -input.points,
      balanceAfter: newBalance,
      consumptionId: null,
      lotId: null,
      reason: input.reason,
      performedByAccountId: input.performedBy.accountId,
      performedByName: input.performedBy.name,
    });

    return this.adjustmentResult(input, row.balance, newBalance, -input.points, inserted);
  }

  private adjustmentResult(
    input: AjustarInput,
    balanceBefore: number,
    balanceAfter: number,
    signedPoints: number,
    inserted: InsertedMovement,
  ): AjustarResult {
    return {
      balanceBefore,
      balanceAfter,
      movement: {
        id: inserted.id,
        createdAt: inserted.createdAt,
        points: signedPoints,
        balanceAfter,
        reason: input.reason,
        performedBy: input.performedBy,
      },
    };
  }

  // BASE-4 (CA-B4.6, §3.9.1 pasos 6 y 7): descuenta los puntos de un canje al registrar su uso.
  // - Bloquea primero la fila de customer_points (FOR UPDATE), como todo lo que mueve puntos.
  // - Saldo real: si balance < points o el saldo es negativo, InsufficientBalanceError y no toca
  //   nada (quien llama lo mapea a 409 INSUFFICIENT_BALANCE). Una deuda con saldo suficiente no
  //   bloquea: se mira solo el saldo, como en §3.9.1 (decisión tomada a pedido de Deni).
  // - Descuenta de los lotes ACTIVE en orden de vencimiento (FIFO). Como
  //   balance = Σ remaining − debt, con balance >= points siempre alcanza.
  // - Inserta el movimiento REDEMPTION por −points con balanceAfter y redemption_id.
  // - No toca lifetimePoints ni la deuda: canjear no baja el nivel.
  // No existe la operación inversa: cancelar, rechazar y vencer no reintegran nada (S4-1).
  async canjear(input: CanjearInput): Promise<CanjearResult> {
    if (!Number.isInteger(input.points) || input.points <= 0) {
      throw new Error('Redemption points must be a positive integer');
    }

    return await this.transactionRunner.run(async () => {
      const row = await this.pointsRepository.lockOrCreateBalance(input.customerId);
      if (row.balance < 0 || input.points > row.balance) {
        throw new InsufficientBalanceError();
      }

      const lots = await this.pointsRepository.findActiveLotsByCustomerId(input.customerId);
      let remainingToSubtract = input.points;
      for (const lot of lots) {
        if (remainingToSubtract === 0) break;
        const take = Math.min(lot.getRemainingPoints(), remainingToSubtract);
        if (take > 0) {
          lot.consume(take);
          await this.pointsRepository.updateLot(lot);
          remainingToSubtract -= take;
        }
      }

      const newBalance = row.balance - input.points;
      await this.pointsRepository.updateBalance(input.customerId, {
        balance: newBalance,
        debt: row.debt,
        lifetimePoints: row.lifetimePoints,
      });
      await this.pointsRepository.insertMovement({
        customerId: input.customerId,
        type: 'REDEMPTION',
        points: -input.points,
        balanceAfter: newBalance,
        consumptionId: null,
        lotId: null,
        redemptionId: input.redemptionId,
        performedByAccountId: input.performedBy.accountId,
        performedByName: input.performedBy.name,
      });

      return { balanceBefore: row.balance, balanceAfter: newBalance };
    });
  }

  // US-25 (§3.6.3): vence los lotes ACTIVE con expiresAt <= now y saldo, de clientes activos.
  // Cada lote va en su propia transacción: si uno falla, los demás siguen y ese queda como
  // estaba. En cada una, igual que el resto de las operaciones, primero se bloquea la fila de
  // customer_points (§3.12) y después el lote, con SKIP LOCKED (CA-25.4): si otra instancia
  // lo tiene, se saltea; si ya venció, no se vuelve a procesar. `onExpired` corre dentro de la
  // transacción (ahí se escribe la auditoría): si falla, se deshace también el vencimiento.
  // No toca lifetimePoints ni la deuda: el vencimiento no baja el nivel (CA-25.3).
  async vencerLotes(
    now: Date,
    onExpired: (expired: ExpiredLot) => Promise<void>,
  ): Promise<ExpirationRunResult> {
    const candidates = await this.pointsRepository.findExpiredLotCandidates(now);
    const result: ExpirationRunResult = { expiredLots: 0, expiredPoints: 0, failures: [] };

    for (const candidate of candidates) {
      let points: number;
      try {
        points = await this.expireLot(candidate, now, onExpired);
      } catch (error) {
        result.failures.push({ lotId: candidate.lotId, error });
        continue;
      }
      if (points > 0) {
        result.expiredLots += 1;
        result.expiredPoints += points;
      }
    }
    return result;
  }

  // Un lote, en su propia transacción. Devuelve los puntos vencidos (0 si se salteó).
  private async expireLot(
    candidate: { lotId: number; customerId: number },
    now: Date,
    onExpired: (expired: ExpiredLot) => Promise<void>,
  ): Promise<number> {
    return await this.transactionRunner.run(async () => {
      const row = await this.pointsRepository.lockOrCreateBalance(candidate.customerId);
      const lot = await this.pointsRepository.lockLotForExpiration(candidate.lotId);
      // Bloqueado por otra instancia, o ya procesado entre la búsqueda y el bloqueo
      if (!lot || !this.canExpire(lot, now)) return 0;

      const expiredPoints = lot.expire(now);
      const newBalance = row.balance - expiredPoints;
      await this.pointsRepository.updateLot(lot);
      await this.pointsRepository.updateBalance(candidate.customerId, {
        balance: newBalance,
        debt: row.debt,
        lifetimePoints: row.lifetimePoints,
      });
      await this.pointsRepository.insertMovement({
        customerId: candidate.customerId,
        type: 'EXPIRATION',
        points: -expiredPoints,
        balanceAfter: newBalance,
        consumptionId: null,
        lotId: candidate.lotId,
        performedByAccountId: null,
        performedByName: SYSTEM_PERFORMER_NAME,
      });
      await onExpired({
        lotId: candidate.lotId,
        customer: await this.pointsRepository.findExpirationCustomer(candidate.customerId),
        points: expiredPoints,
        accreditedAt: lot.getAccreditedAt(),
        balanceAfter: newBalance,
      });
      return expiredPoints;
    });
  }

  private canExpire(lot: PointsLot, now: Date): boolean {
    return (
      lot.isActive() &&
      lot.getRemainingPoints() > 0 &&
      lot.getExpiresAt().getTime() <= now.getTime()
    );
  }

  // CA-BASE.9: forma exacta de §3.4.1. Lectura pura, sin lock (no muta nada).
  async resumen(customerId: number): Promise<PointsSummary> {
    const row = await this.pointsRepository.findBalance(customerId);
    const config = await this.requireActiveConfiguration();

    const balance = row?.balance ?? 0;
    const lifetimePoints = row?.lifetimePoints ?? 0;
    const level = calculateLevel(lifetimePoints, config.silverMinPoints, config.goldMinPoints);

    const lots = await this.pointsRepository.findActiveLotsByCustomerId(customerId);
    const nextExpirations = lots
      .filter((lot) => lot.getRemainingPoints() > 0)
      .slice(0, MAX_NEXT_EXPIRATIONS)
      .map((lot) => ({
        points: lot.getRemainingPoints(),
        expiresAt: toArgentinaDateString(lot.getExpiresAt()),
      }));

    return {
      customerId,
      balance,
      negativeBalance: balance < 0,
      lifetimePoints,
      level,
      nextExpirations,
    };
  }

  // CA-BASE.3/CA-BASE.5 ADD: la deuda se cancela antes que nada; lo que sobra es lo que
  // efectivamente se acredita a un lote nuevo.
  private cancelDebtFirst(
    currentDebt: number,
    pointsToCredit: number,
  ): { newDebt: number; remainingToCredit: number } {
    const cancelled = Math.min(currentDebt, pointsToCredit);
    return {
      newDebt: currentDebt - cancelled,
      remainingToCredit: pointsToCredit - cancelled,
    };
  }

  private async requireActiveConfiguration() {
    const config = await this.pointsRepository.findActiveLoyaltyConfiguration();
    if (!config) {
      // No debería pasar en el flujo normal: quien llama (consumptions, US-24) ya validó
      // que hay una configuración vigente antes de llegar hasta acá.
      throw new Error('No active loyalty configuration found');
    }
    return config;
  }
}
