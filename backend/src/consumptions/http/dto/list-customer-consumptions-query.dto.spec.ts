import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListCustomerConsumptionsQueryDto } from './list-customer-consumptions-query.dto.js';

const errorsOf = (plain: object) =>
  validateSync(plainToInstance(ListCustomerConsumptionsQueryDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

const parse = (plain: object) =>
  plainToInstance(ListCustomerConsumptionsQueryDto, plain);

describe('ListCustomerConsumptionsQueryDto', () => {
  it('acepta un query vacío, con los valores por defecto', () => {
    expect(errorsOf({})).toEqual([]);
    const dto = parse({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('acepta last24h true/false', () => {
    expect(errorsOf({ last24h: 'true' })).toEqual([]);
    expect(errorsOf({ last24h: 'false' })).toEqual([]);
  });

  it('rechaza last24h con un valor que no sea true/false', () => {
    expect(errorsOf({ last24h: 'yes' })).toContain('last24h');
  });

  it('acepta status REGISTERED/VOIDED', () => {
    expect(errorsOf({ status: 'REGISTERED' })).toEqual([]);
    expect(errorsOf({ status: 'VOIDED' })).toEqual([]);
  });

  it('rechaza un status que no existe', () => {
    expect(errorsOf({ status: 'PENDING' })).toContain('status');
  });

  it('rechaza limit > 100', () => {
    expect(errorsOf({ limit: 101 })).toContain('limit');
  });

  it('rechaza page < 1', () => {
    expect(errorsOf({ page: 0 })).toContain('page');
  });
});
