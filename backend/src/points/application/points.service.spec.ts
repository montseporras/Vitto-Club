import { ExpiredLot, PointsService } from './points.service.js';
import { PointsLot } from '../domain/points-lot.js';
import { InsufficientBalanceError } from '../domain/errors/insufficient-balance.error.js';
import {
  ActiveLoyaltyConfiguration,
  CustomerPointsBalance,
  ExpirationCustomer,
  ExpiredLotCandidate,
  InsertedMovement,
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

  async insertMovement(data: InsertMovementData): Promise<InsertedMovement> {
    this.movements.push(data);
    return { id: this.movements.length, createdAt: new Date('2026-10-16T18:12:00.000Z') };
  }

  async findActiveLoyaltyConfiguration(): Promise<ActiveLoyaltyConfiguration | null> {
    return this.activeConfig;
  }

  // US-25: clientes dados de baja (se excluyen del vencimiento) y lotes bloqueados por otra
  // instancia del proceso (SKIP LOCKED)
  readonly inactiveCustomers = new Set<number>();
  readonly lockedByOtherInstance = new Set<number>();

  async findExpiredLotCandidates(now: Date): Promise<ExpiredLotCandidate[]> {
    return [...this.lots.entries()]
      .filter(
        ([, lot]) =>
          lot.isActive() &&
          lot.getRemainingPoints() > 0 &&
          lot.getExpiresAt().getTime() <= now.getTime() &&
          !this.inactiveCustomers.has(lot.getCustomerId()),
      )
      .sort(([, a], [, b]) => a.getExpiresAt().getTime() - b.getExpiresAt().getTime())
      .map(([lotId, lot]) => ({ lotId, customerId: lot.getCustomerId() }));
  }

  async lockLotForExpiration(lotId: number): Promise<PointsLot | null> {
    if (this.lockedByOtherInstance.has(lotId)) return null;
    return this.lots.get(lotId) ?? null;
  }

  async findExpirationCustomer(customerId: number): Promise<ExpirationCustomer> {
    return {
      id: customerId,
      firstName: 'Carolina',
      lastName: 'Fernández',
      documentType: 'DNI',
      documentNumber: '38456123',
    };
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
          type: 'CONSUMPTION_CREDIT',
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
      expect(lot?.getStatus()).toBe('VOIDED');
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
      expect(lot?.getStatus()).toBe('VOIDED');
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

      expect(result).toEqual({
        balanceBefore: 0,
        balanceAfter: 350,
        movement: {
          id: 1,
          createdAt: new Date('2026-10-16T18:12:00.000Z'),
          points: 350,
          balanceAfter: 350,
          reason: 'Regularización por anulación de consumo',
          performedBy,
        },
      });
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

      expect(result).toMatchObject({ balanceBefore: 500, balanceAfter: 250 });
      // El movimiento de la respuesta va con signo
      expect(result.movement).toMatchObject({ points: -250, balanceAfter: 250, reason: 'Corrección manual' });
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
  describe('vencerLotes (US-25)', () => {
    const now = new Date('2027-10-17T03:05:00.000Z');
    const accreditedAt = new Date('2026-10-16T18:40:00.000Z');
    const expired = new Date('2027-10-16T18:40:00.000Z');
    const notYet = new Date('2027-11-30T03:00:00.000Z');
    let audited: ExpiredLot[];
    const audit = async (lot: ExpiredLot) => {
      audited.push(lot);
    };

    beforeEach(() => {
      audited = [];
    });

    it('vencimiento parcial: vence entero lo que queda, EXPIRATION por −remaining, saldo y auditoría', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 800 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 200, accreditedAt, expiresAt: expired });
      repository.seedLot({ id: 2, customerId: 101, consumptionId: 150, initialPoints: 300, remainingPoints: 300, accreditedAt, expiresAt: notYet });

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 1, expiredPoints: 200, failures: [] });
      const lot = repository.lots.get(1)!;
      expect(lot.getStatus()).toBe('EXPIRED');
      expect(lot.getRemainingPoints()).toBe(0);
      expect(lot.getExpiredAt()).toEqual(now);
      expect(repository.movements).toEqual([
        {
          customerId: 101,
          type: 'EXPIRATION',
          points: -200,
          balanceAfter: 300,
          consumptionId: null,
          lotId: 1,
          performedByAccountId: null,
          performedByName: 'Sistema',
        },
      ]);
      // CA-25.3: lifetimePoints (y el nivel) no cambian
      expect(repository.balances.get(101)).toEqual({ customerId: 101, balance: 300, debt: 0, lifetimePoints: 800 });
      expect(audited).toEqual([
        {
          lotId: 1,
          customer: { id: 101, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456123' },
          points: 200,
          accreditedAt,
          balanceAfter: 300,
        },
      ]);
    });

    it('vencimiento total: el lote con todo su saldo', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 500, accreditedAt, expiresAt: expired });

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 1, expiredPoints: 500, failures: [] });
      expect(repository.balances.get(101)?.balance).toBe(0);
      expect(repository.movements[0]).toMatchObject({ type: 'EXPIRATION', points: -500, balanceAfter: 0 });
    });

    it('un lote que no venció no se toca', async () => {
      repository.seedBalance({ customerId: 101, balance: 300, debt: 0, lifetimePoints: 300 });
      repository.seedLot({ id: 2, customerId: 101, consumptionId: 150, initialPoints: 300, remainingPoints: 300, accreditedAt, expiresAt: notYet });

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 0, expiredPoints: 0, failures: [] });
      expect(repository.lots.get(2)!.getStatus()).toBe('ACTIVE');
      expect(repository.movements).toHaveLength(0);
      expect(audited).toHaveLength(0);
    });

    it('CA-25.4: si corre dos veces, el lote EXPIRED no se vuelve a procesar', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 500, accreditedAt, expiresAt: expired });

      await service.vencerLotes(now, audit);
      const second = await service.vencerLotes(now, audit);

      expect(second).toEqual({ expiredLots: 0, expiredPoints: 0, failures: [] });
      expect(repository.movements).toHaveLength(1);
      expect(audited).toHaveLength(1);
    });

    it('CA-25.4: un lote que otra instancia tiene bloqueado se saltea (SKIP LOCKED)', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 500, accreditedAt, expiresAt: expired });
      repository.lockedByOtherInstance.add(1);

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 0, expiredPoints: 0, failures: [] });
      expect(repository.movements).toHaveLength(0);
    });

    it('los clientes dados de baja se excluyen (decisión de Melisa)', async () => {
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 500, accreditedAt, expiresAt: expired });
      repository.inactiveCustomers.add(101);

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 0, expiredPoints: 0, failures: [] });
      expect(repository.lots.get(1)!.getStatus()).toBe('ACTIVE');
    });

    it('CA-25.5: manda la fecha del lote (snapshot), aunque la vigencia vigente haya cambiado', async () => {
      repository.activeConfig = { pointsExpirationMonths: 24, silverMinPoints: 300, goldMinPoints: 800 };
      repository.seedBalance({ customerId: 101, balance: 500, debt: 0, lifetimePoints: 500 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 500, accreditedAt, expiresAt: expired });

      const result = await service.vencerLotes(now, audit);

      expect(result.expiredLots).toBe(1);
    });

    it('con deuda: el saldo baja y puede quedar negativo; la deuda no cambia', async () => {
      // balance = Σ remaining (200) − debt (50)
      repository.seedBalance({ customerId: 101, balance: 150, debt: 50, lifetimePoints: 700 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 500, remainingPoints: 200, accreditedAt, expiresAt: expired });

      await service.vencerLotes(now, audit);

      expect(repository.balances.get(101)).toEqual({ customerId: 101, balance: -50, debt: 50, lifetimePoints: 700 });
      expect(audited[0].balanceAfter).toBe(-50);
    });

    it('vence los lotes de varios clientes, cada uno con su saldo', async () => {
      repository.seedBalance({ customerId: 101, balance: 100, debt: 0, lifetimePoints: 100 });
      repository.seedBalance({ customerId: 102, balance: 40, debt: 0, lifetimePoints: 40 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 100, remainingPoints: 100, accreditedAt, expiresAt: expired });
      repository.seedLot({ id: 2, customerId: 102, consumptionId: 142, initialPoints: 40, remainingPoints: 40, accreditedAt, expiresAt: expired });

      const result = await service.vencerLotes(now, audit);

      expect(result).toEqual({ expiredLots: 2, expiredPoints: 140, failures: [] });
      expect(repository.balances.get(101)?.balance).toBe(0);
      expect(repository.balances.get(102)?.balance).toBe(0);
    });

    it('si falla un lote (ej. la auditoría), se informa y los demás siguen', async () => {
      repository.seedBalance({ customerId: 101, balance: 100, debt: 0, lifetimePoints: 100 });
      repository.seedBalance({ customerId: 102, balance: 40, debt: 0, lifetimePoints: 40 });
      repository.seedLot({ id: 1, customerId: 101, consumptionId: 141, initialPoints: 100, remainingPoints: 100, accreditedAt, expiresAt: expired });
      repository.seedLot({ id: 2, customerId: 102, consumptionId: 142, initialPoints: 40, remainingPoints: 40, accreditedAt, expiresAt: new Date('2027-10-16T19:00:00.000Z') });
      const failure = new Error('audit failed');

      const result = await service.vencerLotes(now, async (lot) => {
        if (lot.lotId === 1) throw failure;
      });

      expect(result.failures).toEqual([{ lotId: 1, error: failure }]);
      expect(result.expiredLots).toBe(1);
      expect(result.expiredPoints).toBe(40);
    });
  });
});
