import type { AuditService } from '../../audit/application/audit.service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import { PointsExpirationService } from './points-expiration.service.js';
import type { ExpiredLot, PointsService } from './points.service.js';

const expiredLot: ExpiredLot = {
  lotId: 1,
  customer: { id: 101, firstName: 'Carolina', lastName: 'Fernández', documentType: 'DNI', documentNumber: '38456123' },
  points: 200,
  accreditedAt: new Date('2026-08-17T00:30:00.000Z'),
  balanceAfter: 1040,
};

describe('PointsExpirationService (US-25)', () => {
  it('audita POINTS_EXPIRED con actor Sistema por cada lote vencido', async () => {
    const recorded: AuditEntryInput[] = [];
    const now = new Date('2027-10-17T03:05:00.000Z');
    const pointsService = {
      vencerLotes: jest.fn(async (_now: Date, onExpired: (lot: ExpiredLot) => Promise<void>) => {
        await onExpired(expiredLot);
        return { expiredLots: 1, expiredPoints: 200, failures: [] };
      }),
    } as unknown as PointsService;
    const auditService = {
      record: jest.fn(async (entry: AuditEntryInput) => {
        recorded.push(entry);
      }),
    } as unknown as AuditService;

    const result = await new PointsExpirationService(pointsService, auditService).run(now);

    expect(result).toEqual({ expiredLots: 1, expiredPoints: 200, failures: [] });
    expect(pointsService.vencerLotes).toHaveBeenCalledWith(now, expect.any(Function));
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      actor: { type: 'SYSTEM' },
      module: 'POINTS',
      action: 'POINTS_EXPIRED',
      description: 'Venció 200 pts de Carolina Fernández',
    });
  });

  it('un lote que falló no corta el proceso: el resultado lo informa', async () => {
    const failure = { lotId: 7, error: new Error('boom') };
    const pointsService = {
      vencerLotes: jest.fn().mockResolvedValue({ expiredLots: 0, expiredPoints: 0, failures: [failure] }),
    } as unknown as PointsService;
    const auditService = { record: jest.fn() } as unknown as AuditService;

    const result = await new PointsExpirationService(pointsService, auditService).run();

    expect(result.failures).toEqual([failure]);
  });
});
