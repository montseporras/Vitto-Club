import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateEmployeeDto } from './update-employee.dto.js';

// Mismas opciones que el ValidationPipe global de main.ts
const errorsOf = (plain: object) =>
  validateSync(plainToInstance(UpdateEmployeeDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).map((e) => e.property);

describe('UpdateEmployeeDto', () => {
  const valid = {
    firstName: 'Ana',
    lastName: 'Gómez',
    role: 'CASHIER',
    phone: '3510000001',
  };

  it('acepta el body completo del formulario de edición', () => {
    expect(errorsOf(valid)).toEqual([]);
  });

  it('acepta un body sin teléfono o con teléfono null', () => {
    const { phone: _phone, ...withoutPhone } = valid;
    expect(errorsOf(withoutPhone)).toEqual([]);
    expect(errorsOf({ ...valid, phone: null })).toEqual([]);
  });

  it('rechaza el email: no se puede editar', () => {
    expect(errorsOf({ ...valid, email: 'otro@vitto.club' })).toContain('email');
  });

  it('rechaza otros campos que no existen', () => {
    expect(errorsOf({ ...valid, isActive: false })).toContain('isActive');
    expect(errorsOf({ ...valid, id: 99 })).toContain('id');
  });

  it.each(['firstName', 'lastName', 'role'])('exige %s', (field) => {
    const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
    expect(errorsOf(rest)).toContain(field);
  });

  it.each(['firstName', 'lastName', 'role'])('rechaza %s en null', (field) => {
    expect(errorsOf({ ...valid, [field]: null })).toContain(field);
  });

  it.each(['firstName', 'lastName'])('rechaza %s vacío', (field) => {
    expect(errorsOf({ ...valid, [field]: '' })).toContain(field);
  });

  it('rechaza un rol que no sea ADMIN o CASHIER', () => {
    expect(errorsOf({ ...valid, role: 'CLIENTE' })).toContain('role');
  });

  it('rechaza textos más largos que las columnas', () => {
    expect(errorsOf({ ...valid, lastName: 'a'.repeat(81) })).toContain('lastName');
    expect(errorsOf({ ...valid, phone: '1'.repeat(31) })).toContain('phone');
  });
});
