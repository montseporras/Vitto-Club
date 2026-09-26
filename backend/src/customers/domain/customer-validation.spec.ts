import { Customer } from './customer.js';
import { DomainError } from './errors/domain.error.js';

describe('Customer - validaciones de dominio', () => {
  const validData = {
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI' as const,
    documentNumber: '12345678',
    email: 'juan@example.com',
  };

  describe('teléfono', () => {
    it.each([
      '1155555555',
      '+54 11 5555-5555',
      '(011) 4555-5555',
      '+5491155555555',
      '011.4555.5555',
    ])('acepta el formato válido %s', (phone) => {
      expect(Customer.create({ ...validData, phone }).getPhone()).toBe(phone);
    });

    it.each([
      ['letras', '1155abcd55'],
      ['muy corto', '12345'],
      ['demasiados dígitos', '1234567890123456'],
      ['"+" en el medio', '11+55555555'],
      ['símbolos no permitidos', '1155#555555'],
      ['más de 30 caracteres', '1'.repeat(31)],
    ])('rechaza un teléfono inválido (%s)', (_label, phone) => {
      expect(() => Customer.create({ ...validData, phone })).toThrow('Customer phone is invalid');
    });

    it('el teléfono sigue siendo opcional', () => {
      expect(Customer.create(validData).getPhone()).toBeNull();
      expect(Customer.create({ ...validData, phone: null }).getPhone()).toBeNull();
      expect(Customer.create({ ...validData, phone: '   ' }).getPhone()).toBeNull();
    });

    it('rechaza un teléfono inválido también al modificarlo', () => {
      const customer = Customer.create(validData);
      expect(() => customer.setPhone('abc')).toThrow('Customer phone is invalid');
    });
  });

  describe('errores de dominio', () => {
    const catchError = (fn: () => unknown): DomainError => {
      try {
        fn();
      } catch (error) {
        return error as DomainError;
      }
      throw new Error('se esperaba un error');
    };

    it.each([
      ['firstName', () => Customer.create({ ...validData, firstName: ' ' })],
      ['lastName', () => Customer.create({ ...validData, lastName: ' ' })],
      ['documentNumber', () => Customer.create({ ...validData, documentNumber: '..' })],
      ['documentType', () => Customer.create({ ...validData, documentType: 'X' as never })],
      ['email', () => Customer.create({ ...validData, email: 'malo' })],
      ['phone', () => Customer.create({ ...validData, phone: 'abc' })],
      ['dateOfBirth', () => Customer.create({ ...validData, dateOfBirth: new Date('2999-01-01') })],
    ])('el error de %s es un DomainError que indica el campo correcto', (field, fn) => {
      const error = catchError(fn);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.field).toBe(field);
    });

    it('activar y desactivar lanzan DomainError sin campo', () => {
      const customer = Customer.create(validData);
      const error = catchError(() => customer.activate());
      expect(error).toBeInstanceOf(DomainError);
      expect(error.field).toBeUndefined();
    });
  });
});
