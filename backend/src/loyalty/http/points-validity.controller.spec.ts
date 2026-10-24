import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsValidity } from '../domain/points-validity.js';
import { PointsValidityController } from './points-validity.controller.js';
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
    silverMinPoints: 300,
    goldMinPoints: 800,
    isActive: true,
    validFrom: new Date(),
    validTo: null,
    createdAt: new Date(),
    ...overrides,
  });

describe('PointsValidityController', () => {
  let service: {
    setPointsValidity: jest.Mock;
    getCurrentPointsValidity: jest.Mock;
    getActiveConfiguration: jest.Mock;
  };
  let audit: AuditEntryInput[];
  let controller: PointsValidityController;

  beforeEach(() => {
    service = {
      setPointsValidity: jest.fn(),
      getCurrentPointsValidity: jest.fn(),
      getActiveConfiguration: jest.fn().mockResolvedValue(activeConfig()),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new PointsValidityController(
      service as unknown as LoyaltyService,
      capturing.service,
    );
  });

  it('saves a custom validity and returns the response DTO', async () => {
    const validity = PointsValidity.define({ pointsExpirationMonths: 18 });
    service.setPointsValidity.mockResolvedValue(validity);

    const result = await controller.set({ pointsExpirationMonths: 18 }, admin);

    expect(service.setPointsValidity).toHaveBeenCalledWith({
      pointsExpirationMonths: 18,
    });
    expect(result).toMatchObject({
      pointsExpirationMonths: 18,
      updatedAt: null,
    });
  });

  it('saves the default value when the field is omitted', async () => {
    const validity = PointsValidity.define();
    service.setPointsValidity.mockResolvedValue(validity);

    const result = await controller.set({ pointsExpirationMonths: 12 }, admin);

    expect(service.setPointsValidity).toHaveBeenCalledWith({
      pointsExpirationMonths: 12,
    });
    expect(result.pointsExpirationMonths).toBe(12);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'POINTS_VALIDITY_UPDATED',
      description: 'Modificó la vigencia de los puntos',
      details: [{ label: 'Cambios', value: 'Se guardó sin modificar valores' }],
    });
  });

  it('audits the change of months with before and after', async () => {
    service.setPointsValidity.mockResolvedValue(PointsValidity.define({ pointsExpirationMonths: 6 }));
    service.getActiveConfiguration
      .mockResolvedValueOnce(activeConfig())
      .mockResolvedValueOnce(activeConfig({ pointsExpirationMonths: 6 }));

    await controller.set({ pointsExpirationMonths: 6 }, admin);

    expect(audit[0].details).toEqual([{ label: 'Vigencia (meses)', value: '12 → 6' }]);
  });

  it('saves the default when the body itself is absent or null', async () => {
    const validity = PointsValidity.define();
    service.setPointsValidity.mockResolvedValue(validity);

    await controller.set(undefined, admin);
    await controller.set(null as never, admin);

    expect(service.setPointsValidity).toHaveBeenNthCalledWith(1, {
      pointsExpirationMonths: 12,
    });
    expect(service.setPointsValidity).toHaveBeenNthCalledWith(2, {
      pointsExpirationMonths: 12,
    });
  });

  it('returns the current validity', async () => {
    service.getCurrentPointsValidity.mockResolvedValue(PointsValidity.define());

    await expect(controller.getCurrent()).resolves.toMatchObject({
      pointsExpirationMonths: 12,
      updatedAt: null,
    });
  });
});
