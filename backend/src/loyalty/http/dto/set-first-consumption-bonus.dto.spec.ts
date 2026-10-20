import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetFirstPurchaseBonusDto } from './set-first-purchase-bonus.dto.js';

describe('SetFirstPurchaseBonusDto', () => {
  async function validatePayload(payload: object) {
    return validate(plainToInstance(SetFirstPurchaseBonusDto, payload));
  }

  it.each([
    [{ bonusType: 'PERCENTAGE', bonusValue: 15 }, 0],
    [{ bonusType: 'PERCENTAGE', bonusValue: 1 }, 0],
    [{ bonusType: 'PERCENTAGE', bonusValue: 100 }, 0],
    [{ bonusType: 'FIXED_AMOUNT', bonusValue: 30 }, 0],
    [{ bonusType: 'FIXED_AMOUNT', bonusValue: 10_000 }, 0],
  ])('validates payload %j', async (payload, expectedErrorCount) => {
    const errors = await validatePayload(payload);
    expect(errors).toHaveLength(expectedErrorCount);
  });

  it.each([
    { bonusType: 'UNKNOWN', bonusValue: 10 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.1 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.99 },
    { bonusType: 'PERCENTAGE', bonusValue: 0.09 },
    { bonusType: 'PERCENTAGE', bonusValue: 100.01 },
    { bonusType: 'PERCENTAGE', bonusValue: 15.123 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 0 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: -1 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 1.5 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 10_001 },
    { bonusType: 'FIXED_AMOUNT', bonusValue: 'abc' },
    { bonusType: 'PERCENTAGE', bonusValue: '15' },
  ])('rejects payload %j', async (payload) => {
    const errors = await validatePayload(payload);
    expect(errors.length).toBeGreaterThan(0);
  });
});
