import { ConflictException } from '@nestjs/common';
import { CustomerAccountCreationService } from './customer-account-creation.service.js';
import {
  CustomerAccountRepository,
  type AccountByEmail,
} from '../domain/port/customer-account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';

type CreatedAccount = {
  customerId: number;
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
};

class FakeCustomerAccountRepository implements CustomerAccountRepository {
  readonly created: CreatedAccount[] = [];
  // Cuentas que ya existen en la base (de un empleado, de otro cliente, activas o no)
  readonly existing = new Map<string, AccountByEmail>();

  async findByEmail(email: string): Promise<AccountByEmail | null> {
    return this.existing.get(email) ?? null;
  }
  async create(data: CreatedAccount): Promise<{ accountId: number }> {
    this.created.push(data);
    return { accountId: this.created.length };
  }
  async deactivate(): Promise<void> {
    throw new Error('not implemented');
  }
}

class FakePasswordHasher implements PasswordHasher {
  readonly hashed: string[] = [];
  async hash(plainPassword: string): Promise<string> {
    this.hashed.push(plainPassword);
    return `hashed:${plainPassword}`;
  }
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}

describe('CustomerAccountCreationService', () => {
  let accounts: FakeCustomerAccountRepository;
  let hasher: FakePasswordHasher;
  let service: CustomerAccountCreationService;

  beforeEach(() => {
    accounts = new FakeCustomerAccountRepository();
    hasher = new FakePasswordHasher();
    service = new CustomerAccountCreationService(accounts, hasher);
  });

  it('crea la cuenta con el email del cliente, el hash del documento y mustChangePassword = true (CA-17AJ.1)', async () => {
    await service.handleCustomerCreated({
      customerId: 103,
      email: 'sofia.rios@gmail.com',
      documentNumber: '38456123',
    });

    expect(accounts.created).toEqual([
      {
        customerId: 103,
        email: 'sofia.rios@gmail.com',
        passwordHash: 'hashed:38456123',
        mustChangePassword: true,
      },
    ]);
  });

  it('el pasaporte se hashea en mayúsculas, tal como lo trae el evento (CA-17AJ.1)', async () => {
    await service.handleCustomerCreated({
      customerId: 104,
      email: 'jean@example.com',
      documentNumber: 'AB123456',
    });

    expect(hasher.hashed).toEqual(['AB123456']);
  });

  // CA-17AJ.3: un DNI de 7 dígitos tiene menos de 8 caracteres y no cumple la política
  it('acepta como contraseña inicial un DNI de 7 dígitos: no pasa por la política (CA-17AJ.3)', async () => {
    await expect(
      service.handleCustomerCreated({ customerId: 105, email: 'ana@example.com', documentNumber: '1234567' }),
    ).resolves.toBeUndefined();

    expect(accounts.created[0].passwordHash).toBe('hashed:1234567');
  });

  it('normaliza el email de la cuenta (minúsculas, sin espacios)', async () => {
    await service.handleCustomerCreated({
      customerId: 106,
      email: '  Ana@Example.COM ',
      documentNumber: '40123456',
    });

    expect(accounts.created[0].email).toBe('ana@example.com');
  });

  describe('email en uso por otra cuenta activa (CA-17AJ.2)', () => {
    it.each([
      ['de un empleado', { accountId: 1, customerId: null, employeeId: 5, active: true }],
      ['de otro cliente', { accountId: 2, customerId: 90, employeeId: null, active: true }],
    ])('rechaza con 409 EMAIL_IN_USE si el email es %s', async (_label, row) => {
      accounts.existing.set('ocupado@example.com', row);

      const error = await service
        .handleCustomerCreated({ customerId: 107, email: 'ocupado@example.com', documentNumber: '40123456' })
        .then(
          () => null,
          (e: unknown) => e,
        );

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: 'EMAIL_IN_USE',
        message: 'Ya hay un cliente o una cuenta activa con ese mail.',
      });
      // No se crea nada ni se hashea: el error corta antes
      expect(accounts.created).toHaveLength(0);
      expect(hasher.hashed).toHaveLength(0);
    });

    it('una cuenta inactiva con ese email no lo ocupa: los inactivos pueden repetirlo', async () => {
      accounts.existing.set('viejo@example.com', { accountId: 3, customerId: 91, employeeId: null, active: false });

      await service.handleCustomerCreated({ customerId: 108, email: 'viejo@example.com', documentNumber: '40123456' });

      expect(accounts.created).toHaveLength(1);
    });
  });

  it('nunca guarda ni devuelve el documento en claro: solo su hash', async () => {
    await service.handleCustomerCreated({ customerId: 109, email: 'rosa@example.com', documentNumber: '30111222' });

    expect(accounts.created[0]).not.toHaveProperty('password');
    expect(accounts.created[0].passwordHash).not.toBe('30111222');
  });
});
