import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListEmployeesQueryDto } from './list-employees-query.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const errorsOf = (plain: object) =>
  validateSync(plainToInstance(ListEmployeesQueryDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('ListEmployeesQueryDto', () => {
  it('acepta la consulta sin parámetros', () => {
    expect(errorsOf({})).toEqual([]);
  });

  it('acepta active=true, active=false y name', () => {
    expect(errorsOf({ active: 'true' })).toEqual([]);
    expect(errorsOf({ active: 'false', name: 'ana' })).toEqual([]);
  });

  it.each(['abc', '1', 'TRUE'])('rechaza active=%s', (value) => {
    expect(errorsOf({ active: value })).toContain('active');
  });

  it('rechaza un name de más de 80 caracteres', () => {
    expect(errorsOf({ name: 'a'.repeat(81) })).toContain('name');
  });

  it('rechaza parámetros de paginación u otros desconocidos', () => {
    expect(errorsOf({ page: '1' })).toContain('page');
    expect(errorsOf({ limit: '20' })).toContain('limit');
  });
});
