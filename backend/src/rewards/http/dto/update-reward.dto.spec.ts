import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateRewardDto } from './update-reward.dto.js';

const validate = (plain: object) =>
  validateSync(plainToInstance(UpdateRewardDto, plain), { whitelist: true, forbidNonWhitelisted: true });

const messagesOf = (plain: object, field: string) =>
  validate(plain)
    .filter((error) => error.property === field)
    .flatMap((error) => Object.values(error.constraints ?? {}));

describe('UpdateRewardDto (§3.2.4)', () => {
  it('todos los campos son opcionales: un body vacío pasa el DTO (lo frena el servicio)', () => {
    expect(validate({})).toEqual([]);
  });

  it('acepta cualquier campo suelto, con null donde vale', () => {
    expect(validate({ name: 'Brunch' })).toEqual([]);
    expect(validate({ description: null })).toEqual([]);
    expect(validate({ points: 200 })).toEqual([]);
    expect(validate({ stock: null })).toEqual([]);
    expect(validate({ expiresAt: null })).toEqual([]);
  });

  it('stock 0 se acepta al editar (CA-35.3)', () => {
    expect(validate({ stock: 0 })).toEqual([]);
  });

  it('stock negativo: "Ingresá un número entero mayor o igual a 0."', () => {
    expect(messagesOf({ stock: -1 }, 'stock')).toEqual(['Ingresá un número entero mayor o igual a 0.']);
  });

  it.each([
    ['stock', 2.5, 'Ingresá un número entero, sin decimales.'],
    ['stock', 100_001, 'El máximo es 100.000.'],
    ['name', null, 'Completá este campo.'],
    ['name', '   ', 'Completá este campo.'],
    ['name', 'a'.repeat(81), 'Máximo 80 caracteres.'],
    ['description', 'd'.repeat(256), 'Máximo 255 caracteres.'],
    ['points', null, 'Completá este campo.'],
    ['points', 0, 'Ingresá un número entero mayor a 0.'],
    ['points', 1_000_001, 'El máximo es 1.000.000 puntos.'],
    ['expiresAt', '2026-02-30', 'expiresAt no es una fecha válida (YYYY-MM-DD)'],
  ])('%s = %p: "%s"', (field, value, message) => {
    expect(messagesOf({ [field]: value }, field)).toEqual([message]);
  });

  it.each(['status', 'disabledReason', 'usedCount', 'id', 'photoUrl'])('%s no se puede mandar', (field) => {
    const errors = validate({ [field]: 'x' });
    expect(errors.flatMap((error) => Object.values(error.constraints ?? {}))).toEqual([
      `property ${field} should not exist`,
    ]);
  });
});
