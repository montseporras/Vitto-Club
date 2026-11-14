import { StatisticsInputError } from '../domain/errors/statistics-input.error.js';
import { ReportRenderer } from '../domain/port/report-renderer.js';
import type { ReportModel } from '../domain/report-model.js';
import { StatisticsReportService } from './statistics-report.service.js';
import { StatisticsService } from './statistics.service.js';

const NOW = new Date('2026-11-14T18:30:00.000Z');

function setup() {
  const statistics = {
    customers: jest.fn().mockResolvedValue({
      active: 1,
      new: 1,
      frequent: 1,
      frequentMinConsumptions: 3,
      last6Months: [],
    }),
    consumptions: jest.fn().mockResolvedValue({ total: { count: 0, amount: 0 }, byWeekday: [], byTimeSlot: [] }),
    points: jest.fn().mockResolvedValue({
      awarded: 0,
      bonus: 0,
      missionRewards: 0,
      birthdayBonus: 0,
      redeemed: 0,
      expired: 0,
      voided: 0,
      previousMonth: { awarded: 0, bonus: 0, missionRewards: 0, birthdayBonus: 0, redeemed: 0, expired: 0, voided: 0 },
    }),
    program: jest.fn().mockResolvedValue({
      levels: [],
      levelUps: 0,
      missions: { assigned: 0, inProgress: 0, completed: 0, claimed: 0, expired: 0 },
      topRewards: [],
      redemptionsUsed: 0,
    }),
  };
  const render = jest.fn<Promise<Buffer>, [ReportModel]>().mockResolvedValue(Buffer.from('%PDF-fake'));
  const service = new StatisticsReportService(
    statistics as unknown as StatisticsService,
    { render } as unknown as ReportRenderer,
  );
  return { statistics, render, service };
}

describe('StatisticsReportService — US-55 (§3.9.5)', () => {
  it('el nombre es vitto-club-reporte-{mes}-01-{mes}-{último día}.pdf, aunque el mes esté en curso', async () => {
    const { service } = setup();

    expect((await service.generate('2026-10', 'POINTS', NOW)).filename).toBe(
      'vitto-club-reporte-2026-10-01-2026-10-31.pdf',
    );
    expect((await service.generate('2026-11', 'POINTS', NOW)).filename).toBe(
      'vitto-club-reporte-2026-11-01-2026-11-30.pdf',
    );
  });

  it('solo consulta y dibuja las secciones pedidas, en el orden del contrato', async () => {
    const { service, statistics, render } = setup();

    const result = await service.generate('2026-11', 'PROGRAM,CUSTOMERS', NOW);

    expect(result.buffer.toString()).toBe('%PDF-fake');
    expect(statistics.customers).toHaveBeenCalledTimes(1);
    expect(statistics.program).toHaveBeenCalledTimes(1);
    expect(statistics.consumptions).not.toHaveBeenCalled();
    expect(statistics.points).not.toHaveBeenCalled();
    expect(render.mock.calls[0][0].sections.map((section) => section.title)).toEqual(['Clientes', 'Programa']);
  });

  it('sin secciones o con un mes inválido responde el error del contrato y no consulta nada', async () => {
    const { service, statistics } = setup();

    await expect(service.generate('2026-11', undefined, NOW)).rejects.toEqual(
      new StatisticsInputError('Elegí al menos una sección.', 'sections'),
    );
    await expect(service.generate('2027-01', 'POINTS', NOW)).rejects.toEqual(
      new StatisticsInputError('No se puede elegir un mes que todavía no empezó.', 'month'),
    );
    expect(statistics.points).not.toHaveBeenCalled();
  });
});
