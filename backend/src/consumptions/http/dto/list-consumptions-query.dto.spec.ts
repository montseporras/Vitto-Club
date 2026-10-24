import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListConsumptionsQueryDto } from './list-consumptions-query.dto.js';
import { ListMyConsumptionsQueryDto } from './list-my-consumptions-query.dto.js';

const errorsOf = (cls: new () => object, plain: object) =>
  validateSync(plainToInstance(cls, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('ListConsumptionsQueryDto (§3.3.1)', () => {
  it('acepta un query vacío, con los valores por defecto', () => {
    expect(errorsOf(ListConsumptionsQueryDto, {})).toEqual([]);
    const dto = plainToInstance(ListConsumptionsQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('acepta todos los filtros juntos y convierte los numéricos', () => {
    const plain = {
      fromDate: '2026-10-01',
      toDate: '2026-10-15',
      q: '38456',
      status: 'VOIDED',
      registeredByAccountId: '12',
      customerId: '101',
      page: '2',
      limit: '8',
    };
    expect(errorsOf(ListConsumptionsQueryDto, plain)).toEqual([]);
    const dto = plainToInstance(ListConsumptionsQueryDto, plain);
    expect(dto.registeredByAccountId).toBe(12);
    expect(dto.customerId).toBe(101);
    expect(dto.limit).toBe(8);
  });

  it('rechaza q de más de 80 caracteres', () => {
    expect(errorsOf(ListConsumptionsQueryDto, { q: 'a'.repeat(81) })).toContain('q');
    expect(errorsOf(ListConsumptionsQueryDto, { q: 'a'.repeat(80) })).toEqual([]);
  });

  it('rechaza un status que no existe', () => {
    expect(errorsOf(ListConsumptionsQueryDto, { status: 'PENDING' })).toContain('status');
  });

  it('rechaza registeredByAccountId y customerId que no sean enteros positivos', () => {
    expect(errorsOf(ListConsumptionsQueryDto, { registeredByAccountId: 'abc' })).toContain('registeredByAccountId');
    expect(errorsOf(ListConsumptionsQueryDto, { customerId: 0 })).toContain('customerId');
  });

  it('rechaza limit > 100 y page < 1', () => {
    expect(errorsOf(ListConsumptionsQueryDto, { limit: 101 })).toContain('limit');
    expect(errorsOf(ListConsumptionsQueryDto, { page: 0 })).toContain('page');
  });

  it('rechaza last24h, que no es un filtro de este listado', () => {
    expect(errorsOf(ListConsumptionsQueryDto, { last24h: 'true' })).toContain('last24h');
  });
});

describe('ListMyConsumptionsQueryDto (§3.10.2)', () => {
  it('acepta status, page y limit', () => {
    expect(errorsOf(ListMyConsumptionsQueryDto, { status: 'REGISTERED', page: '1', limit: '5' })).toEqual([]);
  });

  it('rechaza last24h: el historial del Cliente no lo tiene', () => {
    expect(errorsOf(ListMyConsumptionsQueryDto, { last24h: 'true' })).toContain('last24h');
  });

  it('rechaza un status que no existe', () => {
    expect(errorsOf(ListMyConsumptionsQueryDto, { status: 'PENDING' })).toContain('status');
  });
});
