import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterAccountDto } from './register-account.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const errorsOf = (plain: object) =>
  validateSync(plainToInstance(RegisterAccountDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('RegisterAccountDto', () => {
  const valid = { employeeId: 2, email: 'bruno.perez@vitto.club', password: 'secreta123' };

  it('acepta un body válido', () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it.each(['employeeId', 'email', 'password'])('exige %s', (field) => {
    const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
    expect(errorsOf(rest)).toContain(field);
  });

  it('rechaza employeeId no positivo', () => {
    expect(errorsOf({ ...valid, employeeId: 0 })).toContain('employeeId');
    expect(errorsOf({ ...valid, employeeId: -1 })).toContain('employeeId');
  });

  it('rechaza employeeId no entero', () => {
    expect(errorsOf({ ...valid, employeeId: 2.5 })).toContain('employeeId');
  });

  it('rechaza un email con formato inválido', () => {
    expect(errorsOf({ ...valid, email: 'nope' })).toContain('email');
  });

  it('rechaza password de menos de 8 caracteres', () => {
    expect(errorsOf({ ...valid, password: 'x'.repeat(7) })).toContain('password');
  });

  it('acepta password de exactamente 8 caracteres', () => {
    expect(errorsOf({ ...valid, password: 'x'.repeat(8) })).toEqual([]);
  });

  it('acepta password de exactamente 64 caracteres', () => {
    expect(errorsOf({ ...valid, password: 'x'.repeat(64) })).toEqual([]);
  });

  it('rechaza password de más de 64 caracteres', () => {
    expect(errorsOf({ ...valid, password: 'x'.repeat(65) })).toContain('password');
  });

  it('rechaza campos que no existen (username, identifier, passwordHash, role)', () => {
    expect(errorsOf({ ...valid, username: 'bruno.perez' })).toContain('username');
    expect(errorsOf({ ...valid, identifier: 'bruno.perez@vitto.club' })).toContain('identifier');
    expect(errorsOf({ ...valid, passwordHash: 'x' })).toContain('passwordHash');
    expect(errorsOf({ ...valid, role: 'ADMIN' })).toContain('role');
  });
});
