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
  it('acepta la contraseña sola', () => {
    expect(errorsOf({ password: 'secreta123' })).toEqual([]);
  });

  it('rechaza un body vacío: la contraseña es obligatoria', () => {
    expect(errorsOf({})).toContain('password');
  });

  it('rechaza role: el rol se cambia desde empleados (contrato §3.11.2)', () => {
    expect(errorsOf({ password: 'secreta123', role: 'ADMIN' })).toContain('role');
    expect(errorsOf({ role: 'ADMIN' })).toEqual(expect.arrayContaining(['role', 'password']));
  });

  it('rechaza password de menos de 8 o más de 64 caracteres', () => {
    expect(errorsOf({ password: 'x'.repeat(7) })).toContain('password');
    expect(errorsOf({ password: 'x'.repeat(65) })).toContain('password');
  });

  it('rechaza email: no se edita desde este ABMC', () => {
    expect(errorsOf({ password: 'secreta123', email: 'nuevo@vitto.club' })).toContain('email');
  });

  it('rechaza campos que no existen (username, identifier, passwordHash)', () => {
    expect(errorsOf({ password: 'secreta123', username: 'x' })).toContain('username');
    expect(errorsOf({ password: 'secreta123', identifier: 'x' })).toContain('identifier');
    expect(errorsOf({ password: 'secreta123', passwordHash: 'x' })).toContain('passwordHash');
  });
});
