import { EventEmitter2 } from '@nestjs/event-emitter';
import { CustomersService } from '../../customers/application/customers.service.js';
import { ACCOUNT_PASSWORD_CHANGED } from '../../shared/events/domain-events.js';
import { AccountCredentialsRepository } from '../domain/port/account-credentials.repository.js';
import type { AccountCredentials } from '../domain/port/account-credentials.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { TransactionRunner } from '../domain/port/transaction-runner.js';
import { InMemoryPasswordAttemptLimiter } from '../infrastructure/in-memory-password-attempt-limiter.js';
import { PasswordChangeService } from './password-change.service.js';

// Hash falso y reversible: alcanza para probar la lógica sin bcrypt
class FakeHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hash:${plain}`;
  }
}

class FakeCredentials extends AccountCredentialsRepository {
  readonly accounts: AccountCredentials[] = [];
  readonly updates: { accountId: number; passwordHash: string }[] = [];

  async findActiveById(accountId: number): Promise<AccountCredentials | null> {
    return this.accounts.find((a) => a.accountId === accountId) ?? null;
  }
  async findActiveByCustomerId(customerId: number): Promise<AccountCredentials | null> {
    return this.accounts.find((a) => a.customerId === customerId) ?? null;
  }
  async updatePassword(accountId: number, passwordHash: string): Promise<void> {
    this.updates.push({ accountId, passwordHash });
  }
  async existsActiveByEmail(email: string, excludeAccountId: number): Promise<boolean> {
    return this.accounts.some((a) => a.email === email && a.accountId !== excludeAccountId);
  }
}

class PassthroughRunner extends TransactionRunner {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }
}

const CUSTOMER_ACCOUNT: AccountCredentials = {
  accountId: 10,
  email: 'marcos@mail.com',
  passwordHash: 'hash:30111222',
  role: 'CUSTOMER',
  customerId: 1,
};
const EMPLOYEE_ACCOUNT: AccountCredentials = {
  accountId: 20,
  email: 'ana@vitto.club',
  passwordHash: 'hash:ClaveDeAna1',
  role: 'CASHIER',
  customerId: null,
};

describe('PasswordChangeService (PERFIL)', () => {
  let credentials: FakeCredentials;
  let emitAsync: jest.Mock;
  let findCustomer: jest.Mock;
  let service: PasswordChangeService;

  const codeOf = async (promise: Promise<unknown>): Promise<unknown> => {
    try {
      await promise;
    } catch (error) {
      return (error as { getResponse(): { code?: string } }).getResponse().code;
    }
    return undefined;
  };
  const statusOf = async (promise: Promise<unknown>): Promise<number | undefined> => {
    try {
      await promise;
    } catch (error) {
      return (error as { getStatus(): number }).getStatus();
    }
    return undefined;
  };

  const change = (overrides: Partial<Parameters<PasswordChangeService['changeOwnPassword']>[0]> = {}) =>
    service.changeOwnPassword({
      accountId: 10,
      currentPassword: '30111222',
      newPassword: 'MiClave2026',
      currentRefreshToken: 'cookie-actual',
      ...overrides,
    });

  beforeEach(() => {
    credentials = new FakeCredentials();
    credentials.accounts.push({ ...CUSTOMER_ACCOUNT }, { ...EMPLOYEE_ACCOUNT });
    emitAsync = jest.fn().mockResolvedValue([]);
    findCustomer = jest.fn().mockResolvedValue({ getDocumentNumber: () => '30111222' });
    service = new PasswordChangeService(
      credentials,
      new FakeHasher(),
      new InMemoryPasswordAttemptLimiter(),
      { findById: findCustomer } as unknown as CustomersService,
      new PassthroughRunner(),
      { emitAsync } as unknown as EventEmitter2,
    );
  });

  describe('changeOwnPassword()', () => {
    it('guarda el hash nuevo y avisa con la sesión actual para que auth cierre las otras', async () => {
      await change();

      expect(credentials.updates).toEqual([{ accountId: 10, passwordHash: 'hash:MiClave2026' }]);
      expect(emitAsync).toHaveBeenCalledWith(ACCOUNT_PASSWORD_CHANGED, {
        accountId: 10,
        currentRefreshToken: 'cookie-actual',
      });
    });

    it('con la actual incorrecta responde 400 CURRENT_PASSWORD_INCORRECT y no guarda nada', async () => {
      const promise = change({ currentPassword: 'equivocada' });

      expect(await statusOf(promise)).toBe(400);
      expect(await codeOf(change({ currentPassword: 'equivocada' }))).toBe('CURRENT_PASSWORD_INCORRECT');
      expect(credentials.updates).toEqual([]);
      expect(emitAsync).not.toHaveBeenCalled();
    });

    it('verifica primero la actual: con la actual mal y la nueva inválida gana CURRENT_PASSWORD_INCORRECT', async () => {
      expect(await codeOf(change({ currentPassword: 'equivocada', newPassword: 'corta' }))).toBe(
        'CURRENT_PASSWORD_INCORRECT',
      );
    });

    it('nueva igual a la actual: PASSWORD_SAME_AS_CURRENT', async () => {
      credentials.accounts[0].passwordHash = 'hash:ClaveActual1';

      expect(await codeOf(change({ currentPassword: 'ClaveActual1', newPassword: 'ClaveActual1' }))).toBe(
        'PASSWORD_SAME_AS_CURRENT',
      );
      expect(credentials.updates).toEqual([]);
    });

    it('cliente con la nueva igual a su documento: PASSWORD_SAME_AS_DOCUMENT', async () => {
      credentials.accounts[0].passwordHash = 'hash:ClaveActual1';

      expect(await codeOf(change({ currentPassword: 'ClaveActual1', newPassword: '30111222' }))).toBe(
        'PASSWORD_SAME_AS_DOCUMENT',
      );
    });

    it('nueva igual al mail: 400 sin código (el contrato no le asigna uno)', async () => {
      const promise = change({ newPassword: 'marcos@mail.com' });

      expect(await statusOf(promise)).toBe(400);
      expect(await codeOf(change({ newPassword: 'marcos@mail.com' }))).toBeUndefined();
    });

    it('nueva que no cumple el largo: 400 con el mensaje de la regla', async () => {
      await expect(change({ newPassword: 'corta' })).rejects.toThrow('Tiene que tener entre 8 y 64 caracteres');
    });

    it('un empleado puede cambiar la suya y no se le aplica la regla del documento', async () => {
      await service.changeOwnPassword({
        accountId: 20,
        currentPassword: 'ClaveDeAna1',
        newPassword: '30111222',
      });

      expect(credentials.updates).toEqual([{ accountId: 20, passwordHash: 'hash:30111222' }]);
      expect(findCustomer).not.toHaveBeenCalled();
    });

    it('la cuenta inexistente o inactiva responde 401 UNAUTHENTICATED', async () => {
      expect(await codeOf(change({ accountId: 999 }))).toBe('UNAUTHENTICATED');
    });

    it('al sexto intento responde 429 TOO_MANY_ATTEMPTS, aunque la contraseña sea la correcta', async () => {
      for (let i = 0; i < 5; i++) {
        expect(await codeOf(change({ currentPassword: 'equivocada' }))).toBe('CURRENT_PASSWORD_INCORRECT');
      }

      const blocked = change();
      expect(await statusOf(blocked)).toBe(429);
      expect(await codeOf(change())).toBe('TOO_MANY_ATTEMPTS');
      expect(credentials.updates).toEqual([]);
    });

    it('un acierto no cuenta ni reinicia el contador', async () => {
      for (let i = 0; i < 4; i++) await codeOf(change({ currentPassword: 'equivocada' }));
      await change();

      await codeOf(change({ currentPassword: 'equivocada' }));

      expect(await codeOf(change())).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('handleCustomerEmailChangeRequested()', () => {
    const request = (overrides: Partial<Parameters<PasswordChangeService['handleCustomerEmailChangeRequested']>[0]> = {}) =>
      service.handleCustomerEmailChangeRequested({
        customerId: 1,
        email: 'nuevo@mail.com',
        currentPassword: '30111222',
        ...overrides,
      });

    it('con la contraseña correcta y el correo libre no tira nada', async () => {
      await expect(request()).resolves.toBeUndefined();
    });

    it('con la contraseña incorrecta responde 400 CURRENT_PASSWORD_INCORRECT', async () => {
      expect(await codeOf(request({ currentPassword: 'equivocada' }))).toBe('CURRENT_PASSWORD_INCORRECT');
    });

    it('si otra cuenta activa usa el correo, responde 409 EMAIL_IN_USE', async () => {
      expect(await codeOf(request({ email: 'ana@vitto.club' }))).toBe('EMAIL_IN_USE');
    });

    it('compara el correo normalizado', async () => {
      expect(await codeOf(request({ email: ' ANA@vitto.club ' }))).toBe('EMAIL_IN_USE');
    });

    it('verifica la contraseña antes que el correo: con ambas mal, no revela si el correo existe', async () => {
      expect(await codeOf(request({ email: 'ana@vitto.club', currentPassword: 'equivocada' }))).toBe(
        'CURRENT_PASSWORD_INCORRECT',
      );
    });

    it('comparte el contador de intentos con el cambio de contraseña', async () => {
      for (let i = 0; i < 3; i++) await codeOf(request({ currentPassword: 'equivocada' }));
      for (let i = 0; i < 2; i++) await codeOf(change({ currentPassword: 'equivocada' }));

      expect(await codeOf(request())).toBe('TOO_MANY_ATTEMPTS');
      expect(await codeOf(change())).toBe('TOO_MANY_ATTEMPTS');
    });

    it('un cliente sin cuenta activa responde 401 UNAUTHENTICATED', async () => {
      expect(await codeOf(request({ customerId: 999 }))).toBe('UNAUTHENTICATED');
    });
  });
});
