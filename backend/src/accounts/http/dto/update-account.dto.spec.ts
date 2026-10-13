import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateAccountDto } from './update-account.dto.js';

const errorsOf = (plain: object) =>
  validateSync(plainToInstance(UpdateAccountDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('UpdateAccountDto', () => {
  it('acepta un body vacío a nivel de DTO (el "al menos uno" lo valida el controller)', () => {
    expect(errorsOf({})).toEqual([]);
  });

  it('acepta solo role', () => {
    expect(errorsOf({ role: 'ADMIN' })).toEqual([]);
    expect(errorsOf({ role: 'CASHIER' })).toEqual([]);
  });

  it('acepta solo password', () => {
    expect(errorsOf({ password: 'secreta123' })).toEqual([]);
  });

  it('acepta ambos', () => {
    expect(errorsOf({ role: 'ADMIN', password: 'secreta123' })).toEqual([]);
  });

  it('rechaza un rol que no sea ADMIN o CASHIER', () => {
    expect(errorsOf({ role: 'CUSTOMER' })).toContain('role');
    expect(errorsOf({ role: 'SUPERADMIN' })).toContain('role');
  });

  it('rechaza password de menos de 8 o más de 64 caracteres', () => {
    expect(errorsOf({ password: 'x'.repeat(7) })).toContain('password');
    expect(errorsOf({ password: 'x'.repeat(65) })).toContain('password');
  });

  it('rechaza email: no se edita desde este ABMC', () => {
    expect(errorsOf({ role: 'ADMIN', email: 'nuevo@vitto.club' })).toContain('email');
  });

  it('rechaza campos que no existen (username, identifier, passwordHash)', () => {
    expect(errorsOf({ role: 'ADMIN', username: 'x' })).toContain('username');
    expect(errorsOf({ role: 'ADMIN', identifier: 'x' })).toContain('identifier');
    expect(errorsOf({ role: 'ADMIN', passwordHash: 'x' })).toContain('passwordHash');
  });
});
