import { Employee } from './employee.js';
import { DomainError } from './errors/domain.error.js';

describe('Employee Entity', () => {
  const validData = {
    firstName: 'Ana',
    lastName: 'Gómez',
    email: 'Ana.Gomez@Vitto.Club',
    role: 'CASHIER' as const,
    phone: '+54 351 000-0001',
  };

  describe('create()', () => {
    it('debería crear un empleado válido, sin id y activo', () => {
      const employee = Employee.create(validData);

      expect(employee.getId()).toBeNull(); // Nace sin ID antes de persistir
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getRole()).toBe('CASHIER');
      expect(employee.getPhone()).toBe('+54 351 000-0001');
      expect(employee.isActive()).toBe(true);
      expect(employee.getDeactivatedAt()).toBeNull();
    });

    it('debería aceptar el rol ADMIN', () => {
      expect(Employee.create({ ...validData, role: 'ADMIN' }).getRole()).toBe('ADMIN');
    });

    it('debería normalizar el mail a minúsculas y sin espacios', () => {
      const employee = Employee.create({ ...validData, email: '  Ana.Gomez@Vitto.Club  ' });
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
    });

    it('debería recortar los espacios en blanco de los campos de texto', () => {
      const employee = Employee.create({
        ...validData,
        firstName: '  Ana  ',
        lastName: '  Gómez  ',
        phone: '  3510000001  ',
      });
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getPhone()).toBe('3510000001');
    });

    it('debería permitir crear un empleado sin teléfono', () => {
      expect(Employee.create({ ...validData, phone: undefined }).getPhone()).toBeNull();
      expect(Employee.create({ ...validData, phone: null }).getPhone()).toBeNull();
      expect(Employee.create({ ...validData, phone: '   ' }).getPhone()).toBeNull();
    });

    it('debería lanzar un error si el nombre está vacío', () => {
      expect(() => Employee.create({ ...validData, firstName: '   ' })).toThrow(
        'Employee firstName cannot be empty',
      );
    });

    it('debería lanzar un error si el apellido está vacío', () => {
      expect(() => Employee.create({ ...validData, lastName: '' })).toThrow(
        'Employee lastName cannot be empty',
      );
    });

    it('debería lanzar un error si el nombre supera los 80 caracteres', () => {
      expect(() => Employee.create({ ...validData, firstName: 'a'.repeat(81) })).toThrow(
        'Employee firstName cannot exceed 80 characters',
      );
    });

    it('debería lanzar un error si el mail tiene un formato inválido', () => {
      expect(() => Employee.create({ ...validData, email: 'no-es-un-mail' })).toThrow(
        'Invalid email format',
      );
    });

    it('debería lanzar un error si el rol es inválido', () => {
      expect(() => Employee.create({ ...validData, role: 'CLIENTE' as never })).toThrow(
        'Employee role must be one of: ADMIN, CASHIER',
      );
    });
  });

  describe('teléfono', () => {
    it.each(['3510000001', '+54 351 000-0001', '(0351) 400-0001', '0351.400.0001'])(
      'acepta el formato válido %s',
      (phone) => {
        expect(Employee.create({ ...validData, phone }).getPhone()).toBe(phone);
      },
    );

    it.each([
      ['letras', '351abcd001'],
      ['muy corto', '12345'],
      ['demasiados dígitos', '1234567890123456'],
      ['"+" en el medio', '351+0000001'],
      ['símbolos no permitidos', '351#0000001'],
      ['más de 30 caracteres', '1'.repeat(31)],
    ])('rechaza un teléfono inválido (%s)', (_label, phone) => {
      expect(() => Employee.create({ ...validData, phone })).toThrow('Employee phone is invalid');
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
      ['firstName', () => Employee.create({ ...validData, firstName: ' ' })],
      ['lastName', () => Employee.create({ ...validData, lastName: ' ' })],
      ['email', () => Employee.create({ ...validData, email: 'malo' })],
      ['role', () => Employee.create({ ...validData, role: 'X' as never })],
      ['phone', () => Employee.create({ ...validData, phone: 'abc' })],
    ])('el error de %s es un DomainError que indica el campo correcto', (field, fn) => {
      const error = catchError(fn);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.field).toBe(field);
    });
  });

  describe('update()', () => {
    const persisted = () =>
      Employee.reconstruct({ ...validData, id: 7, email: 'ana.gomez@vitto.club', active: true });

    const updateData = {
      firstName: 'Ana María',
      lastName: 'Gómez Paz',
      role: 'ADMIN' as const,
      phone: '3519999999',
    };

    it('debería reemplazar nombre, apellido, rol y teléfono', () => {
      const employee = persisted();
      employee.update(updateData);

      expect(employee.getFirstName()).toBe('Ana María');
      expect(employee.getLastName()).toBe('Gómez Paz');
      expect(employee.getRole()).toBe('ADMIN');
      expect(employee.getPhone()).toBe('3519999999');
    });

    it('debería conservar id, email y estado', () => {
      const employee = persisted();
      employee.update(updateData);

      expect(employee.getId()).toBe(7);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.isActive()).toBe(true);
    });

    it('debería recortar los espacios en blanco', () => {
      const employee = persisted();
      employee.update({ ...updateData, firstName: '  Ana  ', phone: '  3519999999  ' });

      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getPhone()).toBe('3519999999');
    });

    it('debería dejar al empleado sin teléfono si phone está ausente, es null o vacío', () => {
      const { phone: _phone, ...withoutPhone } = updateData;

      const a = persisted();
      a.update(withoutPhone);
      expect(a.getPhone()).toBeNull();

      const b = persisted();
      b.update({ ...updateData, phone: null });
      expect(b.getPhone()).toBeNull();

      const c = persisted();
      c.update({ ...updateData, phone: '   ' });
      expect(c.getPhone()).toBeNull();
    });

    it.each([
      ['firstName', { firstName: '  ' }, 'Employee firstName cannot be empty'],
      ['lastName', { lastName: '' }, 'Employee lastName cannot be empty'],
      ['role', { role: 'CLIENTE' as never }, 'Employee role must be one of'],
      ['phone', { phone: 'abc' }, 'Employee phone is invalid'],
    ])('debería rechazar un %s inválido', (_field, change, message) => {
      const employee = persisted();
      expect(() => employee.update({ ...updateData, ...change })).toThrow(message);
    });

    it('no debería modificar nada si alguna validación falla (atómico)', () => {
      const employee = persisted();

      // Nombre y rol válidos, teléfono inválido: no se aplica ningún cambio
      expect(() => employee.update({ ...updateData, phone: 'abc' })).toThrow(DomainError);

      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getRole()).toBe('CASHIER');
      expect(employee.getPhone()).toBe('+54 351 000-0001');
    });
  });

  describe('deactivate()', () => {
    const persisted = () =>
      Employee.reconstruct({ ...validData, id: 7, email: 'ana.gomez@vitto.club', active: true });

    it('debería desactivar al empleado y registrar la fecha de baja', () => {
      const employee = persisted();
      expect(employee.getDeactivatedAt()).toBeNull();

      employee.deactivate();

      expect(employee.isActive()).toBe(false);
      expect(employee.getDeactivatedAt()).toBeInstanceOf(Date);
    });

    it('debería conservar el resto de los datos', () => {
      const employee = persisted();
      employee.deactivate();

      expect(employee.getId()).toBe(7);
      expect(employee.getEmail()).toBe('ana.gomez@vitto.club');
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.getLastName()).toBe('Gómez');
      expect(employee.getPhone()).toBe('+54 351 000-0001');
      expect(employee.getRole()).toBe('CASHIER');
    });

    it('debería lanzar un DomainError sin campo si ya está inactivo', () => {
      const deactivatedAt = new Date('2026-01-01T00:00:00.000Z');
      const employee = Employee.reconstruct({ ...validData, id: 7, active: false, deactivatedAt });

      let error: unknown;
      try {
        employee.deactivate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).message).toBe('Employee is already inactive');
      expect((error as DomainError).field).toBeUndefined();
      expect(employee.getDeactivatedAt()).toEqual(deactivatedAt);
    });
  });

  describe('reconstruct()', () => {
    it('debería reconstruir un empleado persistido previamente', () => {
      const employee = Employee.reconstruct({ ...validData, id: 10, active: false });

      expect(employee.getId()).toBe(10);
      expect(employee.getFirstName()).toBe('Ana');
      expect(employee.isActive()).toBe(false);
    });
  });
});
