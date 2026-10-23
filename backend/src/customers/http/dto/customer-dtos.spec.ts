import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateCustomerDto } from './update-customer.dto.js';
import { ListCustomersQueryDto } from './list-customers-query.dto.js';
import { FindCustomerByDocumentQueryDto } from './find-customer-by-document-query.dto.js';

const errorsOf = <T extends object>(cls: new () => T, plain: object) =>
  validateSync(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true }).map(
    (e) => e.property,
  );

describe('UpdateCustomerDto', () => {
  it('acepta un body con un solo campo', () => {
    expect(errorsOf(UpdateCustomerDto, { firstName: 'Ana' })).toEqual([]);
  });

  it.each(['firstName', 'lastName', 'email', 'documentNumber', 'documentType'])(
    'rechaza null en el campo obligatorio %s (antes daba "Cannot read properties of null")',
    (field) => {
      expect(errorsOf(UpdateCustomerDto, { [field]: null })).toContain(field);
    },
  );

  it.each(['firstName', 'lastName', 'documentNumber'])('rechaza %s vacío', (field) => {
    expect(errorsOf(UpdateCustomerDto, { [field]: '' })).toContain(field);
  });

  it('rechaza un email con formato inválido', () => {
    expect(errorsOf(UpdateCustomerDto, { email: 'nope' })).toContain('email');
  });

  it('permite borrar teléfono y fecha de nacimiento con null', () => {
    expect(errorsOf(UpdateCustomerDto, { phone: null, dateOfBirth: null })).toEqual([]);
  });

  it('rechaza campos que no existen', () => {
    expect(errorsOf(UpdateCustomerDto, { foo: 1 })).toContain('foo');
  });

  // CLI-ADM: reason sin espacios en los extremos, de 1 a 500 caracteres
  describe('reason', () => {
    it('lo acepta y le recorta los espacios de los extremos', () => {
      const dto = plainToInstance(UpdateCustomerDto, { phone: '3510000000', reason: '  Error de carga  ' });

      expect(dto.reason).toBe('Error de carga');
      expect(errorsOf(UpdateCustomerDto, { phone: '3510000000', reason: '  Error de carga  ' })).toEqual([]);
    });

    it('acepta 500 caracteres y rechaza 501 con el mensaje en castellano', () => {
      expect(errorsOf(UpdateCustomerDto, { reason: 'x'.repeat(500) })).toEqual([]);
      const errors = validateSync(plainToInstance(UpdateCustomerDto, { reason: 'x'.repeat(501) }));
      expect(errors[0].constraints?.maxLength).toBe('El motivo no puede superar los 500 caracteres.');
    });

    it('rechaza un motivo que no es texto', () => {
      expect(errorsOf(UpdateCustomerDto, { reason: 5 })).toContain('reason');
    });
  });
});

describe('ListCustomersQueryDto', () => {
  it('sin parámetros usa page=1 y limit=20', () => {
    const dto = plainToInstance(ListCustomersQueryDto, {});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(errorsOf(ListCustomersQueryDto, {})).toEqual([]);
  });

  it('convierte page y limit de texto a número', () => {
    const dto = plainToInstance(ListCustomersQueryDto, { page: '2', limit: '50' });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it.each([
    ['limit', 'abc'],
    ['limit', '0'],
    ['limit', '101'],
    ['page', 'abc'],
    ['page', '0'],
    ['page', '1.5'],
    ['active', 'abc'],
    ['active', '1'],
    ['level', 'PLATINUM'],
    ['level', 'bronze'],
    ['sort', 'email'],
    ['q', 'x'.repeat(81)],
  ])('rechaza %s=%s', (field, value) => {
    expect(errorsOf(ListCustomersQueryDto, { [field]: value })).toContain(field);
  });

  // CLI-ADM: la pantalla llama con active=true&sort=lastName&q=...&level=...
  it('acepta q (hasta 80), level y sort', () => {
    expect(
      errorsOf(ListCustomersQueryDto, { active: 'true', sort: 'lastName', q: 'x'.repeat(80), level: 'GOLD' }),
    ).toEqual([]);
    expect(errorsOf(ListCustomersQueryDto, { sort: 'id', level: 'BRONZE' })).toEqual([]);
  });

  it('sort, level y q son opcionales: sin ellos quedan sin valor', () => {
    const dto = plainToInstance(ListCustomersQueryDto, {});
    expect(dto.sort).toBeUndefined();
    expect(dto.level).toBeUndefined();
    expect(dto.q).toBeUndefined();
  });

  it('acepta active=true, active=false y name', () => {
    expect(errorsOf(ListCustomersQueryDto, { active: 'true' })).toEqual([]);
    expect(errorsOf(ListCustomersQueryDto, { active: 'false', name: 'juan' })).toEqual([]);
  });
});

describe('FindCustomerByDocumentQueryDto', () => {
  it('asume DNI si no se envía documentType', () => {
    const dto = plainToInstance(FindCustomerByDocumentQueryDto, { documentNumber: '123' });
    expect(dto.documentType).toBe('DNI');
  });

  it('exige documentNumber', () => {
    expect(errorsOf(FindCustomerByDocumentQueryDto, {})).toContain('documentNumber');
    expect(errorsOf(FindCustomerByDocumentQueryDto, { documentNumber: '' })).toContain('documentNumber');
  });

  it('rechaza un documentType inválido', () => {
    expect(
      errorsOf(FindCustomerByDocumentQueryDto, { documentType: 'CUIT', documentNumber: '1' }),
    ).toContain('documentType');
  });

  it('acepta PASSPORT', () => {
    expect(
      errorsOf(FindCustomerByDocumentQueryDto, { documentType: 'PASSPORT', documentNumber: 'AB123' }),
    ).toEqual([]);
  });
});
