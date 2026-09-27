import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const errorsOf = (plain: object) =>
  validateSync(plainToInstance(CreateEmployeeDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('CreateEmployeeDto', () => {
  const valid = {
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'ana.gomez@vitto.club',
    role: 'ADMIN',
    phone: '3510000001',
  };

  it('acepta un body completo', () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it('acepta un body sin teléfono', () => {
    const { phone: _phone, ...withoutPhone } = valid;
    expect(errorsOf(withoutPhone)).toEqual([]);
  });

  it.each(['firstName', 'lastName', 'email', 'role'])('exige %s', (field) => {
    const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
    expect(errorsOf(rest)).toContain(field);
  });

  it.each(['firstName', 'lastName', 'email'])('rechaza %s vacío', (field) => {
    expect(errorsOf({ ...valid, [field]: '' })).toContain(field);
  });

  it('rechaza un email con formato inválido', () => {
    expect(errorsOf({ ...valid, email: 'nope' })).toContain('email');
  });

  it('rechaza un rol que no sea ADMIN o CASHIER', () => {
    expect(errorsOf({ ...valid, role: 'CLIENTE' })).toContain('role');
  });

  it('acepta el rol CASHIER', () => {
    expect(errorsOf({ ...valid, role: 'CASHIER' })).toEqual([]);
  });

  it('rechaza textos más largos que las columnas', () => {
    expect(errorsOf({ ...valid, firstName: 'a'.repeat(81) })).toContain('firstName');
    expect(errorsOf({ ...valid, phone: '1'.repeat(31) })).toContain('phone');
  });

  it('rechaza campos que no existen', () => {
    expect(errorsOf({ ...valid, isActive: false })).toContain('isActive');
  });
});
