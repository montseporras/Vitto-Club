import { CustomerAccountSyncService } from './customer-account-sync.service.js';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import { PasswordHasher } from '../domain/port/password-hasher.js';
import { ACCOUNT_DEACTIVATED } from '../../shared/events/domain-events.js';

describe('CustomerAccountSyncService (CLI-ADM)', () => {
  let accounts: jest.Mocked<Pick<CustomerAccountRepository, 'deactivateByCustomerId' | 'replaceInitialPasswordHash'>>;
  let hasher: { hash: jest.Mock };
  let emitAsync: jest.Mock;
  let service: CustomerAccountSyncService;

  beforeEach(() => {
    accounts = { deactivateByCustomerId: jest.fn(), replaceInitialPasswordHash: jest.fn() };
    hasher = { hash: jest.fn(async (plain: string) => `hashed:${plain}`) };
    emitAsync = jest.fn().mockResolvedValue([]);
    service = new CustomerAccountSyncService(
      accounts as unknown as CustomerAccountRepository,
      hasher as unknown as PasswordHasher,
      { emitAsync } as never,
    );
  });

  describe('handleCustomerDeactivated()', () => {
    it('deja inactiva la cuenta y publica account.deactivated para cerrar las sesiones (CA-CLI.9)', async () => {
      accounts.deactivateByCustomerId.mockResolvedValue(55);

      await service.handleCustomerDeactivated({ customerId: 7 });

      expect(accounts.deactivateByCustomerId).toHaveBeenCalledWith(7);
      expect(emitAsync).toHaveBeenCalledWith(ACCOUNT_DEACTIVATED, { accountId: 55 });
    });

    it('un cliente sin cuenta activa no publica nada', async () => {
      accounts.deactivateByCustomerId.mockResolvedValue(null);

      await service.handleCustomerDeactivated({ customerId: 7 });

      expect(emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('handleCustomerDocumentChanged()', () => {
    it('guarda el hash del documento nuevo como contraseña inicial (CA-CLI.7)', async () => {
      await service.handleCustomerDocumentChanged({ customerId: 7, documentNumber: '30111223' });

      expect(hasher.hash).toHaveBeenCalledWith('30111223');
      expect(accounts.replaceInitialPasswordHash).toHaveBeenCalledWith(7, 'hashed:30111223');
    });
  });
});
