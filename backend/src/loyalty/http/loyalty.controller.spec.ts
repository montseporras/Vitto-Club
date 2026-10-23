import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsEquivalence } from '../domain/points-equivalence.js';
import { LoyaltyController } from './loyalty.controller.js';
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { LoyaltyProgramConfiguration } from '../domain/loyalty-program-configuration.js';

const admin: CurrentUserData = { accountId: 1, role: 'ADMIN', employeeId: 1 };
const activeConfig = (overrides: Partial<{
  baseAmount: number | null;
  pointsAwarded: number | null;
  pointsExpirationMonths: number;
  bonusType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
  bonusValue: number | null;
}> = {}) =>
  LoyaltyProgramConfiguration.define({
    version: 1,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: 'PERCENTAGE',
    bonusValue: 15,
    isActive: true,
    validFrom: new Date(),
    validTo: null,
    createdAt: new Date(),
    ...overrides,
  });

describe('LoyaltyController', () => {
  let service: {
    setPointsEquivalence: jest.Mock;
    getCurrentPointsEquivalence: jest.Mock;
    getActiveConfiguration: jest.Mock;
  };
  let audit: AuditEntryInput[];
  let controller: LoyaltyController;

  beforeEach(() => {
    service = {
      setPointsEquivalence: jest.fn(),
      getCurrentPointsEquivalence: jest.fn(),
      getActiveConfiguration: jest.fn().mockResolvedValue(activeConfig()),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new LoyaltyController(service as unknown as LoyaltyService, capturing.service);
  });

  it('saves and returns the points equivalence contract', async () => {
    const configuration = PointsEquivalence.define({
      baseAmount: 996,
      pointsAwarded: 10,
    });
    service.setPointsEquivalence.mockResolvedValue(configuration);

    service.getActiveConfiguration
      .mockResolvedValueOnce(activeConfig())
      .mockResolvedValueOnce(activeConfig({ baseAmount: 996 }));

    const result = await controller.set({ baseAmount: 996, pointsAwarded: 10 }, admin);

    expect(service.setPointsEquivalence).toHaveBeenCalledWith({
      baseAmount: 996,
      pointsAwarded: 10,
    });
    expect(result).toMatchObject({ baseAmount: 996, pointsAwarded: 10 });
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(audit).toEqual([
      {
        actor: { type: 'EMPLOYEE', accountId: 1 },
        module: 'CONFIGURATION',
        action: 'POINTS_EQUIVALENCE_UPDATED',
        description: 'Modificó la equivalencia de puntos',
        details: [
          { label: 'Monto base ($)', value: '1.000 → 996' },
          { label: 'Puntos por monto', value: '10 → 10' },
        ],
      },
    ]);
  });

  it('audits a save that changes nothing with the fixed row', async () => {
    service.setPointsEquivalence.mockResolvedValue(
      PointsEquivalence.define({ baseAmount: 1000, pointsAwarded: 10 }),
    );

    await controller.set({ baseAmount: 1000, pointsAwarded: 10 }, admin);

    expect(audit).toHaveLength(1);
    expect(audit[0].details).toEqual([
      { label: 'Cambios', value: 'Se guardó sin modificar valores' },
    ]);
  });

  it('does not audit when the save fails', async () => {
    service.setPointsEquivalence.mockRejectedValue(new Error('invalid'));

    await expect(
      controller.set({ baseAmount: 1000, pointsAwarded: 10 }, admin),
    ).rejects.toThrow('invalid');
    expect(audit).toEqual([]);
  });

  it('returns the current points equivalence', async () => {
    const configuration = PointsEquivalence.define({
      baseAmount: 1000,
      pointsAwarded: 10,
    });
    service.getCurrentPointsEquivalence.mockResolvedValue(configuration);

    await expect(controller.getCurrent()).resolves.toMatchObject({
      baseAmount: 1000,
      pointsAwarded: 10,
    });
  });
});
