import { LoyaltyService } from '../application/loyalty.service.js';
import { FirstPurchaseBonus } from '../domain/first-purchase-bonus.js';
import { FirstPurchaseBonusController } from './first-purchase-bonus.controller.js';
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

describe('FirstPurchaseBonusController', () => {
  let service: {
    setFirstPurchaseBonus: jest.Mock;
    getCurrentFirstPurchaseBonus: jest.Mock;
    getActiveConfiguration: jest.Mock;
  };
  let audit: AuditEntryInput[];
  let controller: FirstPurchaseBonusController;

  beforeEach(() => {
    service = {
      setFirstPurchaseBonus: jest.fn(),
      getCurrentFirstPurchaseBonus: jest.fn(),
      getActiveConfiguration: jest.fn().mockResolvedValue(activeConfig()),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new FirstPurchaseBonusController(
      service as unknown as LoyaltyService,
      capturing.service,
    );
  });

  it('saves a percentage bonus and returns its response DTO', async () => {
    const bonus = FirstPurchaseBonus.define({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    service.setFirstPurchaseBonus.mockResolvedValue(bonus);

    service.getActiveConfiguration
      .mockResolvedValueOnce(activeConfig({ bonusType: 'FIXED_AMOUNT', bonusValue: 30 }))
      .mockResolvedValueOnce(activeConfig());

    const response = await controller.set(
      { bonusType: 'PERCENTAGE', bonusValue: 15 },
      admin,
    );

    expect(service.setFirstPurchaseBonus).toHaveBeenCalledWith({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    expect(response).toMatchObject({
      bonusType: 'PERCENTAGE',
      bonusValue: 15,
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      action: 'FIRST_PURCHASE_BONUS_UPDATED',
      description: 'Modificó la bonificación por primera compra',
      details: [
        { label: 'Tipo de bonificación', value: 'Puntos fijos → Porcentaje' },
        { label: 'Valor de bonificación', value: '30 → 15' },
      ],
    });
  });

  it('returns the current fixed bonus', async () => {
    service.getCurrentFirstPurchaseBonus.mockResolvedValue(
      FirstPurchaseBonus.define({
        bonusType: 'FIXED_AMOUNT',
        bonusValue: 30,
      }),
    );

    await expect(controller.getCurrent()).resolves.toMatchObject({
      bonusType: 'FIXED_AMOUNT',
      bonusValue: 30,
    });
  });
});
