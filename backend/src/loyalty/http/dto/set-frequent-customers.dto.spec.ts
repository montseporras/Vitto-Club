import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetFrequentCustomersDto } from './set-frequent-customers.dto.js';

async function messages(payload: object): Promise<Record<string, string[]>> {
  const errors = await validate(plainToInstance(SetFrequentCustomersDto, payload));
  return Object.fromEntries(errors.map((error) => [error.property, Object.values(error.constraints ?? {})]));
}

describe('SetFrequentCustomersDto — §3.9.6', () => {
  it.each([1, 3, 100])('acepta %d', async (minConsumptions) => {
    await expect(messages({ minConsumptions })).resolves.toEqual({});
  });

  it.each([{}, { minConsumptions: null }, { minConsumptions: '' }, { minConsumptions: 0 }, { minConsumptions: 101 }, { minConsumptions: 2.5 }, { minConsumptions: 'abc' }])(
    'un solo mensaje del contrato para %j',
    async (payload) => {
      await expect(messages(payload)).resolves.toEqual({
        minConsumptions: ['Ingresá un número entero de 1 a 100.'],
      });
    },
  );
});
