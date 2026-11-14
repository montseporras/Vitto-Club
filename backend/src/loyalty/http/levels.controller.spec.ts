import { LoyaltyService } from '../application/loyalty.service.js';
import { LevelsController } from './levels.controller.js';
import { createCapturingAuditService } from '../../audit/testing/capturing-audit-service.js';
import type { AuditEntryInput } from '../../audit/domain/audit-entry.js';
import type { CurrentUserData } from '../../shared/security/current-user-data.js';
import { LoyaltyProgramConfiguration } from '../domain/loyalty-program-configuration.js';

const admin: CurrentUserData = { accountId: 1, role: 'ADMIN', employeeId: 1 };
const createdAt = new Date('2026-10-16T17:05:00.000Z');
type Benefits = { bronzeBenefit: string | null; silverBenefit: string | null; goldBenefit: string | null };
const noBenefits: Benefits = { bronzeBenefit: null, silverBenefit: null, goldBenefit: null };
const config = (
  version: number,
  silverMinPoints: number,
  goldMinPoints: number,
  benefits: Benefits = noBenefits,
) =>
  LoyaltyProgramConfiguration.define({
    version,
    baseAmount: 1000,
    pointsAwarded: 10,
    pointsExpirationMonths: 12,
    bonusType: null,
    bonusValue: null,
    silverMinPoints,
    goldMinPoints,
    ...benefits,
    isActive: true,
    validFrom: createdAt,
    validTo: null,
    createdAt,
  });

describe('LevelsController', () => {
  let service: { getActiveConfiguration: jest.Mock; setLevels: jest.Mock };
  let audit: AuditEntryInput[];
  let controller: LevelsController;

  beforeEach(() => {
    service = {
      getActiveConfiguration: jest.fn().mockResolvedValue(config(5, 300, 800)),
      setLevels: jest.fn().mockResolvedValue(config(6, 400, 900)),
    };
    const capturing = createCapturingAuditService();
    audit = capturing.entries;
    controller = new LevelsController(service as unknown as LoyaltyService, capturing.service);
  });

  it('getCurrent(): los tres niveles, versión y fecha (CA-27.1)', async () => {
    await expect(controller.getCurrent()).resolves.toEqual({
      levels: [
        { level: 'BRONZE', minPoints: 0, editable: false },
        { level: 'SILVER', minPoints: 300, editable: true },
        { level: 'GOLD', minPoints: 800, editable: true },
      ],
      bronzeBenefit: null,
      silverBenefit: null,
      goldBenefit: null,
      configurationVersion: 5,
      updatedAt: createdAt,
    });
  });

  it('set(): guarda, responde con la forma del GET y audita el antes y el después (CA-27.2)', async () => {
    const result = await controller.set({ silverMinPoints: 400, goldMinPoints: 900 }, admin);

    expect(service.setLevels).toHaveBeenCalledWith({ silverMinPoints: 400, goldMinPoints: 900 });
    expect(result.configurationVersion).toBe(6);
    expect(result.levels.map((level) => level.minPoints)).toEqual([0, 400, 900]);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actor: { type: 'EMPLOYEE', accountId: 1 },
      module: 'CONFIGURATION',
      action: 'LEVELS_UPDATED',
      description: 'Modificó niveles',
      details: [
        { label: 'Plata', value: '300 → 400 pts' },
        { label: 'Oro', value: '800 → 900 pts' },
      ],
    });
  });

  it('getCurrent(): suma el beneficio de cada nivel (CA-NB.1)', async () => {
    service.getActiveConfiguration.mockResolvedValue(
      config(5, 300, 800, { bronzeBenefit: 'Café', silverBenefit: 'Postre gratis', goldBenefit: null }),
    );

    await expect(controller.getCurrent()).resolves.toMatchObject({
      bronzeBenefit: 'Café',
      silverBenefit: 'Postre gratis',
      goldBenefit: null,
    });
  });

  it('set(): pasa los beneficios al servicio y audita "Beneficio {nivel}: antes → después" (CA-NB.2)', async () => {
    service.getActiveConfiguration.mockResolvedValue(
      config(5, 300, 800, { bronzeBenefit: null, silverBenefit: 'Postre gratis', goldBenefit: 'Mesa reservada' }),
    );
    service.setLevels.mockResolvedValue(
      config(6, 300, 800, { bronzeBenefit: 'Café de bienvenida', silverBenefit: 'Postre y café', goldBenefit: null }),
    );
    const body = {
      silverMinPoints: 300,
      goldMinPoints: 800,
      bronzeBenefit: 'Café de bienvenida',
      silverBenefit: 'Postre y café',
      goldBenefit: '',
    };

    const result = await controller.set(body, admin);

    expect(service.setLevels).toHaveBeenCalledWith(body);
    expect(result).toMatchObject({ bronzeBenefit: 'Café de bienvenida', silverBenefit: 'Postre y café', goldBenefit: null });
    expect(audit[0]).toMatchObject({
      action: 'LEVELS_UPDATED',
      details: [
        { label: 'Beneficio Bronce', value: '— → Café de bienvenida' },
        { label: 'Beneficio Plata', value: 'Postre gratis → Postre y café' },
        { label: 'Beneficio Oro', value: 'Mesa reservada → —' },
      ],
    });
  });

  it('set(): si guardar falla, no audita', async () => {
    service.setLevels.mockRejectedValue(new Error('falla'));

    await expect(controller.set({ silverMinPoints: 400, goldMinPoints: 900 }, admin)).rejects.toThrow('falla');
    expect(audit).toHaveLength(0);
  });
});
