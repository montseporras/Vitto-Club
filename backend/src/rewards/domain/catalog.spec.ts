import { buildCatalog, catalogView } from './catalog.js';
import { Reward, type RewardProps } from './reward.js';

const TODAY = '2026-11-08';

let nextId = 1;
const reward = (overrides: Partial<RewardProps> = {}) =>
  Reward.reconstruct({
    id: nextId++,
    name: 'Café + medialuna',
    description: null,
    points: 150,
    stock: 20,
    expiresAt: null,
    status: 'ACTIVE',
    disabledReason: null,
    usedCount: 0,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

const names = (entries: ReturnType<typeof buildCatalog>) => entries.map((entry) => entry.reward.getName());

describe('catálogo del Cliente — US-39', () => {
  describe('catalogView() — §3.5.1', () => {
    it('una ACTIVE vencida que el proceso no marcó se ve DISABLED / EXPIRED (CA-39.1)', () => {
      const entry = catalogView(reward({ expiresAt: '2026-11-07' }), TODAY);
      expect(entry).toMatchObject({ status: 'DISABLED', disabledReason: 'EXPIRED', daysToExpire: -1 });
    });

    it('vence hoy → sigue ACTIVE, con daysToExpire 0', () => {
      expect(catalogView(reward({ expiresAt: TODAY }), TODAY)).toMatchObject({ status: 'ACTIVE', daysToExpire: 0 });
    });

    it('una DISABLED queda como está', () => {
      const entry = catalogView(reward({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' }), TODAY);
      expect(entry).toMatchObject({ status: 'DISABLED', disabledReason: 'OUT_OF_STOCK' });
    });
  });

  const mixed = () => [
    reward({ name: 'Pizza', points: 900, usedCount: 2, expiresAt: '2026-11-20' }),
    reward({ name: 'Café', points: 150, usedCount: 31, expiresAt: '2026-11-11' }),
    reward({ name: 'Agotada', points: 100, stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', usedCount: 5 }),
    reward({ name: 'Inactiva', points: 50, status: 'INACTIVE' }),
    reward({ name: 'Dada de baja', points: 60, status: 'DELETED', deletedAt: new Date() }),
    reward({ name: 'Vence hoy', points: 400, expiresAt: TODAY }),
    reward({ name: 'Vence en 8', points: 300, expiresAt: '2026-11-16' }),
    reward({ name: 'Vencida sin marcar', points: 200, expiresAt: '2026-11-01' }),
  ];

  it('"Todas": Activas y Deshabilitadas por puntos ascendentes; nunca Inactivas ni dadas de baja', () => {
    expect(names(buildCatalog(mixed(), 'ALL', TODAY))).toEqual([
      'Agotada',
      'Café',
      'Vencida sin marcar',
      'Vence en 8',
      'Vence hoy',
      'Pizza',
    ]);
  });

  it('"Todas": a igual puntos, por nombre', () => {
    const rewards = [reward({ name: 'Licuado', points: 100 }), reward({ name: 'Brownie', points: 100 })];
    expect(names(buildCatalog(rewards, 'ALL', TODAY))).toEqual(['Brownie', 'Licuado']);
  });

  it('"Más canjeadas": por usedCount descendente; a igual cantidad, por puntos', () => {
    expect(names(buildCatalog(mixed(), 'MOST_REDEEMED', TODAY))).toEqual([
      'Café',
      'Agotada',
      'Pizza',
      'Vencida sin marcar',
      'Vence en 8',
      'Vence hoy',
    ]);
  });

  it('"Próx. a vencer": solo Activas que vencen en 7 días o menos, por fecha (la de hoy sí; la de 8 días y la vencida, no)', () => {
    expect(names(buildCatalog(mixed(), 'EXPIRING_SOON', TODAY))).toEqual(['Vence hoy', 'Café']);
  });

  it('"Próx. a vencer": a igual fecha, por puntos', () => {
    const rewards = [
      reward({ name: 'Cara', points: 500, expiresAt: '2026-11-10' }),
      reward({ name: 'Barata', points: 100, expiresAt: '2026-11-10' }),
    ];
    expect(names(buildCatalog(rewards, 'EXPIRING_SOON', TODAY))).toEqual(['Barata', 'Cara']);
  });

  it('una Deshabilitada que vence pronto no entra en "Próx. a vencer"', () => {
    const rewards = [reward({ stock: 0, status: 'DISABLED', disabledReason: 'OUT_OF_STOCK', expiresAt: '2026-11-10' })];
    expect(buildCatalog(rewards, 'EXPIRING_SOON', TODAY)).toEqual([]);
  });
});
