import { PointsService } from './points.service.js';
import { PointsLot } from '../domain/points-lot.js';
import { InsufficientBalanceError } from '../domain/errors/insufficient-balance.error.js';
import {
  ActiveLoyaltyConfiguration,
  CustomerPointsBalance,
  InsertMovementData,
  PointsRepository,
} from '../domain/port/points.repository.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';

class FakePointsRepository implements PointsRepository {
  readonly balances = new Map<number, CustomerPointsBalance>();
  readonly lots = new Map<number, PointsLot>();
  readonly movements: InsertMovementData[] = [];
  private nextLotId = 1;
  activeConfig: ActiveLoyaltyConfiguration | null = {
    pointsExpirationMonths: 12,
    silverMinPoints: 300,
    goldMinPoints: 800,
  };

  // Helper de test: carga un saldo inicial conocido (simula que ya hubo movimientos antes).
  seedBalance(data: CustomerPointsBalance): void {
    this.balances.set(data.customerId, { ...data });
  }

  // Helper de test: carga un lote ACTIVE ya persistido con un id conocido.
  seedLot(data: {
    id: number;
    customerId: number;
    consumptionId: number | null;
    initialPoints: number;
    remainingPoints: number;
    accreditedAt: Date;
    expiresAt: Date;
  }): void {
    const lot = PointsLot.reconstruct({ ...data, status: 'ACTIVE' });
    this.lots.set(data.id, lot);
    if (data.id >= this.nextLotId) this.nextLotId = data.id + 1;
  }

  async lockOrCreateBalance(customerId: number): Promise<CustomerPointsBalance> {
    let balance = this.balances.get(customerId);
    if (!balance) {
      balance = { customerId, balance: 0, debt: 0, lifetimePoints: 0 };
      this.balances.set(customerId, balance);
    }
    return { ...balance };
  }

  async findBalance(customerId: number): Promise<CustomerPointsBalance | null> {
    const balance = this.balances.get(customerId);
    return balance ? { ...balance } : null;
  }

  async updateBalance(
    customerId: number,
    data: { balance: number; debt: number; lifetimePoints: number },
  ): Promise<void> {
    this.balances.set(customerId, { customerId, ...data });
  }

  async findActiveLotsByCustomerId(customerId: number): Promise<PointsLot[]> {
    return [...this.lots.values()]
      .filter((lot) => lot.getCustomerId() === customerId && lot.isActive())
      .sort((a, b) => a.getExpiresAt().getTime() - b.getExpiresAt().getTime());
  }

  async findLotByConsumptionId(consumptionId: number): Promise<PointsLot | null> {
    return [...this.lots.values()].find((lot) => lot.getConsumptionId() === consumptionId) ?? null;
  }

  async createLot(lot: PointsLot): Promise<PointsLot> {
    const id = this.nextLotId++;
    const created = PointsLot.reconstruct({
      id,
      customerId: lot.getCustomerId(),
      consumptionId: lot.getConsumptionId(),
      initialPoints: lot.getInitialPoints(),
      remainingPoints: lot.getRemainingPoints(),
      accreditedAt: lot.getAccreditedAt(),
      expiresAt: lot.getExpiresAt(),
      status: lot.getStatus(),
    });
    this.lots.set(id, created);
    return created;
  }

  async updateLot(lot: PointsLot): Promise<void> {
    this.lots.set(lot.getId() as number, lot);
  }

  async insertMovement(data: InsertMovementData): Promise<void> {
    this.movements.push(data);
  }

  async findActiveLoyaltyConfiguration(): Promise<ActiveLoyaltyConfiguration | null> {
    return this.activeConfig;
  }
}

class PassthroughTransactionRunner implements TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

describe('PointsService', () => {
  let repository: FakePointsRepository;
  let service: PointsService;
  const performedBy = { accountId: 12, name: 'Ana Pereyra' };

  beforeEach(() => {
    repository = new FakePointsRepository();
    service = new PointsService(repository, new PassthroughTransactionRunner());
  });

  describe('acreditar (CA-BASE.3)', () => {
    it('acreditar sin deuda: crea un lote nuevo con toda la vigencia vigente', async () => {
      const before = new Date();
      const result = await service.acreditar({
        customerId: 101,
        points: 500,
        consumptionId: 141,
        performedBy,
      });

      expect(result).toEqual({
        balanceBefore: 0,
        balanceAfter: 500,
        lifetimePointsBefore: 0,
        lifetimePointsAfter: 500,
        levelBefore: 'BRONZE',
        levelAfter: 'SILVER',
      });
      const lots = await repository.findActiveLotsByCustomerId(101);
      expect(lots).toHaveLength(1);
      expect(lots[0].getInitialPoints()).toBe(500);
      // Vigencia snapshot: 12 meses desde que se acreditó (configuración de prueba).
      const expectedExpiresAt = new Date(lots[0].getAccreditedAt().getTime());
      expectedExpiresAt.setUTCMonth(expectedExpiresAt.getUTCMonth() + 12);
      expect(lots[0].getAccreditedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lots[0].getExpiresAt()).toEqual(expectedExpiresAt);
      expect(repository.movements).toEqual([
        {
          customerId: 101,
          type: 'PURCHASE_CREDIT',
          points: 500,
          balanceAfter: 500,
          consumptionId: 141,
          lotId: lots[0].getId(),
          performedByAccountId: 12,
          performedByName: 'Ana Pereyra',
        },
      ]);
    });

    it('acreditar con deuda menor que lo acreditado: cancela toda la deuda y crea un lote con el resto', async () => {
      repository.seedBalance({ customerId: 101, balance: -100, debt: 100, lifetimePoints: 900 });

      const result = await service.acreditar({
        customerId: 101,
        points: 500,
        consumptionId: 141,
        performedBy,
      });

      expect(result.balanceBefore).toBe(-100);
      expect(result.balanceAfter).toBe(400);
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(0);
      const lots = await repository.findActiveLotsByCustomerId(101);
      expect(lots[0].getInitialPoints()).toBe(400); // 500 - 100 cancelados
    });

    it('acreditar con deuda mayor que lo acreditado: no crea lote, solo reduce la deuda', async () => {
      repository.seedBalance({ customerId: 101, balance: -600, debt: 600, lifetimePoints: 900 });

      const result = await service.acreditar({
        customerId: 101,
        points: 500,
        consumptionId: 141,
        performedBy,
      });

      expect(result.balanceAfter).toBe(-100); // -600 + 500
      expect(result.levelBefore).toBe('GOLD');
      expect(result.levelAfter).toBe('GOLD'); // ya estaba en Oro, no hay levelUp
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(100); // 600 - 500
      expect(await repository.findActiveLotsByCustomerId(101)).toHaveLength(0);
      expect(repository.movements[0].lotId).toBeNull();
    });

    it('acreditar no acepta amount con fecha fijada por otro: el consumptionId es el mismo que generó el lote', async () => {
      await service.acreditar({ customerId: 101, points: 500, consumptionId: 141, performedBy });

      const lot = await repository.findLotByConsumptionId(141);
      expect(lot).not.toBeNull();
      expect(lot?.getConsumptionId()).toBe(141);
    });
  });

  describe('revertir (CA-BASE.4)', () => {
    it('revertir con el lote entero: no genera deuda', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({
        id: 7,
        customerId: 101,
        consumptionId: 141,
        initialPoints: 500,
        remainingPoints: 500,
        accreditedAt: new Date('2026-10-16T18:40:00.000Z'),
        expiresAt: new Date('2027-10-16T18:40:00.000Z'),
      });

      const result = await service.revertir({
        customerId: 101,
        consumptionId: 141,
        totalPoints: 500,
        performedBy,
      });

      expect(result).toEqual({
        balanceBefore: 500,
        balanceAfter: 0,
        lifetimePointsBefore: 500,
        lifetimePointsAfter: 0,
      });
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(0);
      const lot = await repository.findLotByConsumptionId(141);
      expect(lot?.getStatus()).toBe('CONSUMED');
      expect(lot?.getRemainingPoints()).toBe(0);
    });

    it('revertir con el lote parcialmente gastado: lo no recuperado se convierte en deuda', async () => {
      repository.seedBalance({ customerId: 101, balance: 200, debt: 0, lifetimePoints: 500 });
      repository.seedLot({
        id: 7,
        customerId: 101,
        consumptionId: 141,
        initialPoints: 500,
        remainingPoints: 200, // ya se gastaron 300 en otro lado (ajuste, por ejemplo)
        accreditedAt: new Date('2026-10-16T18:40:00.000Z'),
        expiresAt: new Date('2027-10-16T18:40:00.000Z'),
      });

      const result = await service.revertir({
        customerId: 101,
        consumptionId: 141,
        totalPoints: 500,
        performedBy,
      });

      expect(result.balanceAfter).toBe(-300); // 200 - 500
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(300); // lo que faltó recuperar del lote (500-200)
      const lot = await repository.findLotByConsumptionId(141);
      expect(lot?.getStatus()).toBe('CONSUMED');
      expect(lot?.getRemainingPoints()).toBe(0);
    });

    it('revertir sin lote propio (todo fue a cancelar deuda al acreditar): todo pasa a deuda', async () => {
      repository.seedBalance({ customerId: 101, balance: 0, debt: 0, lifetimePoints: 500 });

      const result = await service.revertir({
        customerId: 101,
        consumptionId: 999,
        totalPoints: 500,
        performedBy,
      });

      expect(result.balanceAfter).toBe(-500);
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(500);
      expect(repository.movements[0].lotId).toBeNull();
    });
  });

  describe('ajustar ADD (CA-BASE.5)', () => {
    it('ADD sin deuda: crea un lote nuevo', async () => {
      const result = await service.ajustar({
        customerId: 101,
        direction: 'ADD',
        points: 350,
        reason: 'Regularización por anulación de consumo',
        performedBy,
      });

      expect(result).toEqual({ balanceBefore: 0, balanceAfter: 350 });
      const lots = await repository.findActiveLotsByCustomerId(101);
      expect(lots[0].getInitialPoints()).toBe(350);
    });

    it('ADD con deuda: regulariza a 0 sin crear lote si cancela justo la deuda', async () => {
      repository.seedBalance({ customerId: 101, balance: -350, debt: 350, lifetimePoints: 1000 });

      const result = await service.ajustar({
        customerId: 101,
        direction: 'ADD',
        points: 350,
        reason: 'Regularización por anulación de consumo',
        performedBy,
      });

      expect(result.balanceAfter).toBe(0);
      const balance = await repository.findBalance(101);
      expect(balance?.debt).toBe(0);
      expect(balance?.lifetimePoints).toBe(1000); // CA-BASE.7: el ajuste no toca lifetimePoints
      expect(await repository.findActiveLotsByCustomerId(101)).toHaveLength(0);
    });
  });

  describe('ajustar SUBTRACT (CA-BASE.5)', () => {
    const seedTwoLots = () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({
        id: 1,
        customerId: 101,
        consumptionId: null,
        initialPoints: 200,
        remainingPoints: 200,
        accreditedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-06-01T00:00:00.000Z'), // vence primero
      });
      repository.seedLot({
        id: 2,
        customerId: 101,
        consumptionId: null,
        initialPoints: 300,
        remainingPoints: 300,
        accreditedAt: new Date('2026-02-01T00:00:00.000Z'),
        expiresAt: new Date('2026-12-01T00:00:00.000Z'), // vence después
      });
    };

    it('SUBTRACT FIFO: descuenta primero del lote que vence antes', async () => {
      seedTwoLots();

      const result = await service.ajustar({
        customerId: 101,
        direction: 'SUBTRACT',
        points: 250,
        reason: 'Corrección manual',
        performedBy,
      });

      expect(result).toEqual({ balanceBefore: 500, balanceAfter: 250 });
      // lot1 se consumió entero primero (vencía antes) y ya no es ACTIVE, así que lo busco
      // directo en el repo fake en vez de por findActiveLotsByCustomerId.
      const lot1 = repository.lots.get(1);
      const lot2 = repository.lots.get(2);
      expect(lot1?.getRemainingPoints()).toBe(0);
      expect(lot1?.getStatus()).toBe('CONSUMED');
      expect(lot2?.getRemainingPoints()).toBe(250); // 300 - 50 restantes
      expect(lot2?.getStatus()).toBe('ACTIVE');
    });

    it('SUBTRACT mayor que el saldo: 409 INSUFFICIENT_BALANCE (lanza el error de dominio)', async () => {
      seedTwoLots();

      await expect(
        service.ajustar({
          customerId: 101,
          direction: 'SUBTRACT',
          points: 501,
          reason: 'Corrección manual',
          performedBy,
        }),
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it('SUBTRACT con saldo negativo: siempre rechaza, sin importar cuántos puntos pida', async () => {
      repository.seedBalance({ customerId: 101, balance: -50, debt: 50, lifetimePoints: 500 });

      await expect(
        service.ajustar({
          customerId: 101,
          direction: 'SUBTRACT',
          points: 1,
          reason: 'Corrección manual',
          performedBy,
        }),
      ).rejects.toThrow(InsufficientBalanceError);
    });
  });

  describe('resumen (CA-BASE.9)', () => {
    it('cliente sin ningún movimiento todavía: todo en 0, Bronce', async () => {
      const summary = await service.resumen(999);

      expect(summary).toEqual({
        customerId: 999,
        balance: 0,
        negativeBalance: false,
        lifetimePoints: 0,
        level: {
          current: 'BRONZE',
          next: 'SILVER',
          currentMinPoints: 0,
          nextMinPoints: 300,
          pointsToNext: 300,
          progressPercent: 0,
        },
        nextExpirations: [],
      });
    });

    it('saldo negativo: negativeBalance true', async () => {
      repository.seedBalance({ customerId: 101, balance: -350, debt: 350, lifetimePoints: 1000 });

      const summary = await service.resumen(101);

      expect(summary.balance).toBe(-350);
      expect(summary.negativeBalance).toBe(true);
    });

    it('nextExpirations: como máximo 5, ordenados por vencimiento, solo con remaining > 0', async () => {
      repository.seedBalance({ customerId: 101, balance: 600, debt: 0, lifetimePoints: 600 });
      for (let i = 1; i <= 6; i++) {
        repository.seedLot({
          id: i,
          customerId: 101,
          consumptionId: null,
          initialPoints: 100,
          remainingPoints: 100,
          accreditedAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date(`2026-0${i}-15T00:00:00.000Z`),
        });
      }

      const summary = await service.resumen(101);

      expect(summary.nextExpirations).toHaveLength(5);
      expect(summary.nextExpirations[0].expiresAt).toBe('2026-01-14'); // el que vence primero
    });
  });
});
