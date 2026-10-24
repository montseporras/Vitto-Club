import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetLevelsDto } from './set-levels.dto.js';
import { UpdateLoyaltyConfigurationDto } from './update-loyalty-configuration.dto.js';

// Mensajes por campo, tal como los arma el ValidationPipe
async function messages(dtoClass: new () => object, payload: object): Promise<Record<string, string[]>> {
  const errors = await validate(plainToInstance(dtoClass, payload));
  return Object.fromEntries(errors.map((error) => [error.property, Object.values(error.constraints ?? {})]));
}

describe('SetLevelsDto — CA-27.3', () => {
  it('acepta umbrales válidos', async () => {
    await expect(messages(SetLevelsDto, { silverMinPoints: 300, goldMinPoints: 800 })).resolves.toEqual({});
  });

  it('un solo mensaje por campo: vacío', async () => {
    await expect(messages(SetLevelsDto, {})).resolves.toEqual({
      silverMinPoints: ['Completá este campo.'],
      goldMinPoints: ['Completá este campo.'],
    });
    await expect(messages(SetLevelsDto, { silverMinPoints: null, goldMinPoints: '' })).resolves.toEqual({
      silverMinPoints: ['Completá este campo.'],
      goldMinPoints: ['Completá este campo.'],
    });
  });

  it('decimales o texto → "Ingresá un número entero, sin decimales."', async () => {
    await expect(messages(SetLevelsDto, { silverMinPoints: 300.5, goldMinPoints: 'abc' })).resolves.toEqual({
      silverMinPoints: ['Ingresá un número entero, sin decimales.'],
      goldMinPoints: ['Ingresá un número entero, sin decimales.'],
    });
  });

  it('Plata ≤ 0', async () => {
    await expect(messages(SetLevelsDto, { silverMinPoints: 0, goldMinPoints: 800 })).resolves.toEqual({
      silverMinPoints: ['El umbral de Plata debe ser mayor que 0'],
    });
  });

  it('Oro ≤ Plata', async () => {
    await expect(messages(SetLevelsDto, { silverMinPoints: 800, goldMinPoints: 800 })).resolves.toEqual({
      goldMinPoints: ['El umbral de Oro debe ser mayor que el de Plata'],
    });
  });

  it('mayor al máximo', async () => {
    await expect(messages(SetLevelsDto, { silverMinPoints: 300, goldMinPoints: 2_147_483_648 })).resolves.toEqual({
      goldMinPoints: ['Ingresá un número menor o igual a 2.147.483.647.'],
    });
  });
});

describe('UpdateLoyaltyConfigurationDto con niveles — CA-27.5', () => {
  const base = { baseAmount: 1000, pointsAwarded: 10, pointsExpirationMonths: 12, bonusType: 'PERCENTAGE', bonusValue: 15 };

  it('los umbrales son opcionales', async () => {
    await expect(messages(UpdateLoyaltyConfigurationDto, base)).resolves.toEqual({});
  });

  it('si vienen, se validan con las mismas reglas', async () => {
    await expect(
      messages(UpdateLoyaltyConfigurationDto, { ...base, silverMinPoints: 900, goldMinPoints: 800 }),
    ).resolves.toEqual({ goldMinPoints: ['El umbral de Oro debe ser mayor que el de Plata'] });
  });
});
