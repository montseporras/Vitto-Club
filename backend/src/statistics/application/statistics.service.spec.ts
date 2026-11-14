import { StatisticsInputError } from '../domain/errors/statistics-input.error.js';
import { StatisticsRepository } from '../domain/port/statistics.repository.js';
import { StatisticsService } from './statistics.service.js';

// 14/11/2026 15:00 en Argentina
const NOW = new Date('2026-11-14T18:00:00.000Z');

function fakeRepository(overrides: Partial<Record<keyof StatisticsRepository, jest.Mock>> = {}) {
  const repository = {
    getFrequentMinConsumptions: jest.fn().mockResolvedValue(3),
    countActiveCustomers: jest.fn().mockResolvedValue(184),
    countNewCustomers: jest.fn().mockResolvedValue(23),
    countFrequentCustomers: jest.fn().mockResolvedValue(70),
    newCustomersConversion: jest.fn().mockResolvedValue([{ month: '2026-11', new: 23, newFrequent: 4 }]),
    consumptionTotals: jest.fn().mockResolvedValue({ count: 606, amount: 9751700.004 }),
    consumptionsByWeekday: jest.fn().mockResolvedValue([{ weekday: 1, count: 78, amount: 1261100 }]),
    consumptionsByTimeSlot: jest.fn().mockResolvedValue([{ slot: 1, count: 145, amount: 2340408 }]),
    pointsTotals: jest.fn().mockResolvedValue({
      awarded: 119665,
      bonus: 690,
      missionRewards: 4020,
      birthdayBonus: 500,
      redeemed: 45473,
      expired: 7180,
      voided: 2393,
    }),
    findLevelThresholdsAt: jest.fn().mockResolvedValue({ silverMinPoints: 300, goldMinPoints: 800 }),
    countCustomersByLevel: jest.fn().mockResolvedValue([
      { level: 'SILVER', customers: 50 },
      { level: 'BRONZE', customers: 120 },
    ]),
    countLevelUps: jest.fn().mockResolvedValue(17),
    countMissionsByStatus: jest.fn().mockResolvedValue({ inProgress: 133, completed: 31, claimed: 62, expired: 0 }),
    topRedeemedRewards: jest.fn().mockResolvedValue([{ id: 1, name: 'Café + medialuna', used: 72 }]),
    countUsedRedemptions: jest.fn().mockResolvedValue(148),
    ...overrides,
  };
  return repository;
}

const build = (repository: ReturnType<typeof fakeRepository>) =>
  new StatisticsService(repository as unknown as StatisticsRepository);

describe('StatisticsService.customers — US-51 (§3.9.1)', () => {
  it('arma la respuesta con activos, nuevos, frecuentes, el mínimo y los 6 meses (los que no tienen altas, en 0)', async () => {
    const repository = fakeRepository();

    const result = await build(repository).customers('2026-11', NOW);

    expect(result).toEqual({
      active: 184,
      new: 23,
      frequent: 70,
      frequentMinConsumptions: 3,
      last6Months: [
        { month: '2026-06', new: 0, newFrequent: 0 },
        { month: '2026-07', new: 0, newFrequent: 0 },
        { month: '2026-08', new: 0, newFrequent: 0 },
        { month: '2026-09', new: 0, newFrequent: 0 },
        { month: '2026-10', new: 0, newFrequent: 0 },
        { month: '2026-11', new: 23, newFrequent: 4 },
      ],
    });
  });

  it('el mes en curso mira los activos de hoy; uno cerrado, los del final del mes', async () => {
    const repository = fakeRepository();
    await build(repository).customers('2026-11', NOW);
    expect(repository.countActiveCustomers).toHaveBeenLastCalledWith(NOW);

    await build(repository).customers('2026-10', NOW);
    expect(repository.countActiveCustomers).toHaveBeenLastCalledWith(new Date('2026-11-01T03:00:00.000Z'));
  });

  it('usa el mínimo configurado para frecuentes y para la conversión, y el rango del mes', async () => {
    const repository = fakeRepository({ getFrequentMinConsumptions: jest.fn().mockResolvedValue(5) });

    const result = await build(repository).customers('2026-10', NOW);

    expect(result.frequentMinConsumptions).toBe(5);
    expect(repository.countFrequentCustomers).toHaveBeenCalledWith(
      { from: new Date('2026-10-01T03:00:00.000Z'), to: new Date('2026-11-01T03:00:00.000Z') },
      5,
    );
    // los 6 meses: de mayo a octubre, en una sola consulta
    expect(repository.newCustomersConversion).toHaveBeenCalledWith(
      { from: new Date('2026-05-01T03:00:00.000Z'), to: new Date('2026-11-01T03:00:00.000Z') },
      5,
    );
  });

  it('un mes inválido no consulta nada', async () => {
    const repository = fakeRepository();

    await expect(build(repository).customers(undefined, NOW)).rejects.toEqual(
      new StatisticsInputError('Elegí un mes.', 'month'),
    );
    expect(repository.countActiveCustomers).not.toHaveBeenCalled();
  });
});

describe('StatisticsService.consumptions — US-52 (§3.9.2)', () => {
  it('trae los 7 días y las 5 franjas, aunque tengan 0, y redondea el monto a 2 decimales', async () => {
    const result = await build(fakeRepository()).consumptions('2026-11', NOW);

    expect(result.total).toEqual({ count: 606, amount: 9751700 });
    expect(result.byWeekday).toHaveLength(7);
    expect(result.byWeekday[0]).toEqual({ weekday: 1, count: 78, amount: 1261100 });
    expect(result.byWeekday[6]).toEqual({ weekday: 7, count: 0, amount: 0 });
    expect(result.byTimeSlot).toHaveLength(5);
    expect(result.byTimeSlot[1]).toEqual({ from: '08:00', to: '12:00', count: 145, amount: 2340408 });
    expect(result.byTimeSlot[0]).toEqual({ from: '00:00', to: '08:00', count: 0, amount: 0 });
  });
});

describe('StatisticsService.points — US-53 (§3.9.3)', () => {
  it('trae los siete totales del mes y los del mes anterior (mes en curso: mismos días)', async () => {
    const pointsTotals = jest
      .fn()
      .mockResolvedValueOnce({ awarded: 10, bonus: 1, missionRewards: 2, birthdayBonus: 3, redeemed: 4, expired: 5, voided: 6 })
      .mockResolvedValueOnce({ awarded: 20, bonus: 0, missionRewards: 0, birthdayBonus: 0, redeemed: 0, expired: 0, voided: 0 });
    const repository = fakeRepository({ pointsTotals });

    const result = await build(repository).points('2026-11', NOW);

    expect(result).toEqual({
      awarded: 10,
      bonus: 1,
      missionRewards: 2,
      birthdayBonus: 3,
      redeemed: 4,
      expired: 5,
      voided: 6,
      previousMonth: { awarded: 20, bonus: 0, missionRewards: 0, birthdayBonus: 0, redeemed: 0, expired: 0, voided: 0 },
    });
    expect(pointsTotals).toHaveBeenNthCalledWith(1, {
      from: new Date('2026-11-01T03:00:00.000Z'),
      to: new Date('2026-12-01T03:00:00.000Z'),
    });
    // del 1 al 14 de octubre, completo
    expect(pointsTotals).toHaveBeenNthCalledWith(2, {
      from: new Date('2026-10-01T03:00:00.000Z'),
      to: new Date('2026-10-15T03:00:00.000Z'),
    });
  });

  it('un mes cerrado se compara contra el mes anterior completo', async () => {
    const pointsTotals = fakeRepository().pointsTotals;
    const repository = fakeRepository({ pointsTotals });

    await build(repository).points('2026-10', NOW);

    expect(pointsTotals).toHaveBeenNthCalledWith(2, {
      from: new Date('2026-09-01T03:00:00.000Z'),
      to: new Date('2026-10-01T03:00:00.000Z'),
    });
  });
});

describe('StatisticsService.program — US-54 (§3.9.4)', () => {
  it('niveles (los tres, en orden), subidas, misiones con assigned = suma, top de recompensas y canjes usados', async () => {
    const result = await build(fakeRepository()).program('2026-11', NOW);

    expect(result).toEqual({
      levels: [
        { level: 'BRONZE', customers: 120 },
        { level: 'SILVER', customers: 50 },
        { level: 'GOLD', customers: 0 },
      ],
      levelUps: 17,
      missions: { assigned: 226, inProgress: 133, completed: 31, claimed: 62, expired: 0 },
      topRewards: [{ id: 1, name: 'Café + medialuna', used: 72 }],
      redemptionsUsed: 148,
    });
  });

  it('pide las asignaciones del mes (período = día 1) y las 10 recompensas más canjeadas del mes', async () => {
    const repository = fakeRepository();

    await build(repository).program('2026-10', NOW);

    expect(repository.countMissionsByStatus).toHaveBeenCalledWith('2026-10-01');
    expect(repository.topRedeemedRewards).toHaveBeenCalledWith(
      { from: new Date('2026-10-01T03:00:00.000Z'), to: new Date('2026-11-01T03:00:00.000Z') },
      10,
    );
  });

  it('levelUps compara el inicio del mes contra su final con los umbrales vigentes en cada momento', async () => {
    const findLevelThresholdsAt = jest
      .fn()
      .mockImplementation((at: Date) =>
        Promise.resolve(
          at.getTime() === new Date('2026-10-01T03:00:00.000Z').getTime()
            ? { silverMinPoints: 200, goldMinPoints: 500 }
            : { silverMinPoints: 300, goldMinPoints: 800 },
        ),
      );
    const repository = fakeRepository({ findLevelThresholdsAt });

    await build(repository).program('2026-10', NOW);

    expect(repository.countLevelUps).toHaveBeenCalledWith({
      start: new Date('2026-10-01T03:00:00.000Z'),
      end: new Date('2026-11-01T03:00:00.000Z'),
      thresholdsAtStart: { silverMinPoints: 200, goldMinPoints: 500 },
      thresholdsAtEnd: { silverMinPoints: 300, goldMinPoints: 800 },
    });
  });
});
