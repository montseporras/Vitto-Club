import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateConsumptionDto } from './create-consumption.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const errorsOf = (plain: object) =>
  validateSync(plainToInstance(CreateConsumptionDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('CreateConsumptionDto', () => {
  const valid = { customerId: 101, amount: 50000 };

  it('acepta un body válido', () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it('acepta con notes', () => {
    expect(errorsOf({ ...valid, notes: 'Mesa 4' })).toEqual([]);
  });

  it.each(['customerId', 'amount'])('exige %s', (field) => {
    const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
    expect(errorsOf(rest)).toContain(field);
  });

  it('rechaza customerId no positivo', () => {
    expect(errorsOf({ ...valid, customerId: 0 })).toContain('customerId');
    expect(errorsOf({ ...valid, customerId: -1 })).toContain('customerId');
  });

  it('rechaza customerId no entero', () => {
    expect(errorsOf({ ...valid, customerId: 2.5 })).toContain('customerId');
  });

  it('rechaza amount <= 0', () => {
    expect(errorsOf({ ...valid, amount: 0 })).toContain('amount');
    expect(errorsOf({ ...valid, amount: -1 })).toContain('amount');
  });

  it('rechaza amount con más de 2 decimales', () => {
    expect(errorsOf({ ...valid, amount: 50000.123 })).toContain('amount');
  });

  it('acepta amount con hasta 2 decimales', () => {
    expect(errorsOf({ ...valid, amount: 12500.5 })).toEqual([]);
  });

  it('rechaza amount mayor al tope', () => {
    expect(errorsOf({ ...valid, amount: 10_000_000_000 })).toContain('amount');
  });

  it('rechaza notes de más de 255 caracteres', () => {
    expect(errorsOf({ ...valid, notes: 'x'.repeat(256) })).toContain('notes');
  });

  it('rechaza campos que no existen (fecha, puntos, cajero, equivalencia — CA-21.6)', () => {
    expect(errorsOf({ ...valid, createdAt: '2026-10-16T18:40:00.000Z' })).toContain('createdAt');
    expect(errorsOf({ ...valid, points: 500 })).toContain('points');
    expect(errorsOf({ ...valid, registeredByAccountId: 12 })).toContain('registeredByAccountId');
    expect(errorsOf({ ...valid, equivalence: { baseAmount: 1000 } })).toContain('equivalence');
  });
});
