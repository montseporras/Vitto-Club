import { Customer } from './customer';

describe('Customer Entity', () => {
  const validData = {
    firstName: 'Juan',
    lastName: 'Pérez',
    documentType: 'DNI' as const,
    documentNumber: '12.345.678',
    email: 'Juan.Perez@Example.com',
    phone: '+54 11 5555-5555',
  };

  describe('create()', () => {
    it('debería crear una instancia de Customer válida', () => {
      const customer = Customer.create(validData);

      expect(customer.getId()).toBeNull(); // Nace sin ID antes de persistir
      expect(customer.getFirstName()).toBe('Juan');
      expect(customer.getLastName()).toBe('Pérez');
      expect(customer.getDocumentType()).toBe('DNI');
      expect(customer.getPhone()).toBe('+54 11 5555-5555');
      expect(customer.getDateOfBirth()).toBeNull();
      expect(customer.isActive()).toBe(true);
      expect(customer.getDeactivatedAt()).toBeNull();
    });

    it('debería normalizar el mail a minúsculas y sin espacios', () => {
      const customer = Customer.create({ ...validData, email: '  Juan.Perez@Example.com  ' });
      expect(customer.getEmail()).toBe('juan.perez@example.com');
    });

    it('debería normalizar el número de documento', () => {
      const customer = Customer.create({ ...validData, documentNumber: ' 12.345-678 ' });
      expect(customer.getDocumentNumber()).toBe('12345678');
    });

    it('debería recortar los espacios en blanco de los campos de texto', () => {
      const customer = Customer.create({
        ...validData,
        firstName: '  Juan  ',
        lastName: '  Pérez  ',
        phone: '  1155555555  ',
      });
      expect(customer.getFirstName()).toBe('Juan');
      expect(customer.getLastName()).toBe('Pérez');
      expect(customer.getPhone()).toBe('1155555555');
    });

    it('debería permitir crear un cliente sin teléfono', () => {
      expect(Customer.create({ ...validData, phone: undefined }).getPhone()).toBeNull();
      expect(Customer.create({ ...validData, phone: '   ' }).getPhone()).toBeNull();
    });

    it('debería lanzar un error si el nombre está vacío', () => {
      expect(() => Customer.create({ ...validData, firstName: '   ' }))
        .toThrow('Customer firstName cannot be empty');
    });

    it('debería lanzar un error si el apellido está vacío', () => {
      expect(() => Customer.create({ ...validData, lastName: '' }))
        .toThrow('Customer lastName cannot be empty');
    });

    it('debería lanzar un error si el número de documento está vacío', () => {
      expect(() => Customer.create({ ...validData, documentNumber: ' . ' }))
        .toThrow('Customer documentNumber cannot be empty');
    });

    it('debería lanzar un error si el tipo de documento es inválido', () => {
      expect(() => Customer.create({ ...validData, documentType: 'CUIT' as never }))
        .toThrow('Customer documentType must be one of');
    });

    it('debería lanzar un error si el mail tiene un formato inválido', () => {
      expect(() => Customer.create({ ...validData, email: 'no-es-un-mail' }))
        .toThrow('Invalid email format');
    });

    it('debería lanzar un error si la fecha de nacimiento es futura', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(() => Customer.create({ ...validData, dateOfBirth: future }))
        .toThrow('Customer dateOfBirth is invalid');
    });
  });

  describe('reconstruct()', () => {
    it('debería reconstruir una entidad Customer persistida previamente', () => {
      const customer = Customer.reconstruct({ ...validData, id: 10, active: false });

      expect(customer.getId()).toBe(10);
      expect(customer.getFirstName()).toBe('Juan');
      expect(customer.isActive()).toBe(false);
    });
  });

  describe('update()', () => {
    it('debería actualizar todas las propiedades correctamente', () => {
      const customer = Customer.create(validData);

      customer.update({
        firstName: 'Ana',
        lastName: 'Gómez',
        documentType: 'PASSPORT',
        documentNumber: 'ab123456',
        email: 'ana.gomez@example.com',
        phone: '1144444444',
        dateOfBirth: new Date('1990-05-20'),
      });

      expect(customer.getFirstName()).toBe('Ana');
      expect(customer.getLastName()).toBe('Gómez');
      expect(customer.getDocumentType()).toBe('PASSPORT');
      expect(customer.getDocumentNumber()).toBe('AB123456');
      expect(customer.getEmail()).toBe('ana.gomez@example.com');
      expect(customer.getPhone()).toBe('1144444444');
      expect(customer.getDateOfBirth()).toEqual(new Date('1990-05-20'));
    });

    it('debería dejar sin cambios los campos no enviados', () => {
      const customer = Customer.create(validData);
      customer.update({ firstName: 'Ana' });

      expect(customer.getFirstName()).toBe('Ana');
      expect(customer.getLastName()).toBe('Pérez');
      expect(customer.getPhone()).toBe('+54 11 5555-5555');
    });

    it('debería permitir borrar el teléfono', () => {
      const customer = Customer.create(validData);
      customer.update({ phone: null });
      expect(customer.getPhone()).toBeNull();
    });
  });

  describe('deactivate() y activate()', () => {
    it('debería desactivar un cliente activo y registrar la fecha', () => {
      const customer = Customer.create(validData);
      customer.deactivate();
      expect(customer.isActive()).toBe(false);
      expect(customer.getDeactivatedAt()).toBeInstanceOf(Date);
    });

    it('debería lanzar un error si se intenta desactivar un cliente ya inactivo', () => {
      const customer = Customer.reconstruct({ ...validData, id: 1, active: false });
      expect(() => customer.deactivate()).toThrow('Customer is already inactive');
    });

    it('debería activar un cliente inactivo y limpiar la fecha de baja', () => {
      const customer = Customer.reconstruct({
        ...validData,
        id: 1,
        active: false,
        deactivatedAt: new Date(),
      });
      customer.activate();
      expect(customer.isActive()).toBe(true);
      expect(customer.getDeactivatedAt()).toBeNull();
    });

    it('debería lanzar un error si se intenta activar un cliente ya activo', () => {
      const customer = Customer.create(validData);
      expect(() => customer.activate()).toThrow('Customer is already active');
    });
  });
});
