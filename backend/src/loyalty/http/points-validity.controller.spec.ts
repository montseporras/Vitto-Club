import { LoyaltyService } from '../application/loyalty.service.js';
import { PointsValidity } from '../domain/points-validity.js';
import { PointsValidityController } from './points-validity.controller.js';

describe('PointsValidityController', () => {
  let service: {
    setPointsValidity: jest.Mock;
    getCurrentPointsValidity: jest.Mock;
  };
  let controller: PointsValidityController;
  const actor = { accountId: 1, role: 'ADMIN' as const, employeeId: 1 };
  const audit = {
    capture: jest.fn().mockImplementation(async (operation, createEntry) => {
      const result = await operation();
      createEntry(result);
      return result;
    }),
  };

  beforeEach(() => {
    service = {
      setPointsValidity: jest.fn(),
      getCurrentPointsValidity: jest.fn(),
    };
    controller = new PointsValidityController(
      service as unknown as LoyaltyService,
      audit as never,
    );
  });

  it('saves a custom validity and returns the response DTO', async () => {
    const validity = PointsValidity.define({ pointsExpirationMonths: 18 });
    service.setPointsValidity.mockResolvedValue(validity);

    const result = await controller.set(actor, { pointsExpirationMonths: 18 });

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

    const result = await controller.set(actor, { pointsExpirationMonths: 12 });

    expect(service.setPointsValidity).toHaveBeenCalledWith({
      pointsExpirationMonths: 12,
    });
    expect(result.pointsExpirationMonths).toBe(12);
  });

  it('saves the default when the body itself is absent or null', async () => {
    const validity = PointsValidity.define();
    service.setPointsValidity.mockResolvedValue(validity);

    await controller.set(actor, undefined);
    await controller.set(actor, null as never);

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
