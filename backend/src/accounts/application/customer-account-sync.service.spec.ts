import { CustomerAccountSyncService } from './customer-account-sync.service.js';
import { CustomerAccountRepository } from '../domain/port/customer-account.repository.js';
import { ACCOUNT_DEACTIVATED } from '../../shared/events/domain-events.js';

describe('CustomerAccountSyncService (CLI-ADM)', () => {
  let accounts: jest.Mocked<Pick<CustomerAccountRepository, 'deactivateByCustomerId'>>;
  let emitAsync: jest.Mock;
  let service: CustomerAccountSyncService;

  beforeEach(() => {
    accounts = { deactivateByCustomerId: jest.fn() };
    emitAsync = jest.fn().mockResolvedValue([]);
    service = new CustomerAccountSyncService(
      accounts as unknown as CustomerAccountRepository,
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
});
