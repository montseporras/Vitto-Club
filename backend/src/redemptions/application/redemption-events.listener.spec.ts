import type { RedemptionResolutionService } from './redemption-resolution.service.js';
import { RedemptionEventsListener } from './redemption-events.listener.js';

describe('RedemptionEventsListener (US-43, CA-43.7)', () => {
  const setup = (rejected = 2) => {
    const rechazarConfirmados = jest.fn().mockResolvedValue(rejected);
    const listener = new RedemptionEventsListener({ rechazarConfirmados } as unknown as RedemptionResolutionService);
    return { listener, rechazarConfirmados };
  };

  it('reward.deactivated → rechaza los de la recompensa con "Recompensa desactivada"', async () => {
    const { listener, rechazarConfirmados } = setup();

    await expect(listener.onRewardDeactivated({ rewardId: 20 })).resolves.toEqual({ rejectedRedemptions: 2 });
    expect(rechazarConfirmados).toHaveBeenCalledWith({ rewardId: 20 }, 'Recompensa desactivada');
  });

  it('reward.deleted → rechaza los de la recompensa con "Recompensa eliminada"', async () => {
    const { listener, rechazarConfirmados } = setup(0);

    await expect(listener.onRewardDeleted({ rewardId: 20 })).resolves.toEqual({ rejectedRedemptions: 0 });
    expect(rechazarConfirmados).toHaveBeenCalledWith({ rewardId: 20 }, 'Recompensa eliminada');
  });

  it('customer.deactivated → rechaza los del cliente con "Cliente dado de baja"', async () => {
    const { listener, rechazarConfirmados } = setup(1);

    await expect(listener.onCustomerDeactivated({ customerId: 7 })).resolves.toEqual({ rejectedRedemptions: 1 });
    expect(rechazarConfirmados).toHaveBeenCalledWith({ customerId: 7 }, 'Cliente dado de baja');
  });

  it('si el rechazo falla, el error sube (se deshace la operación que lo disparó)', async () => {
    const rechazarConfirmados = jest.fn().mockRejectedValue(new Error('boom'));
    const listener = new RedemptionEventsListener({ rechazarConfirmados } as unknown as RedemptionResolutionService);

    await expect(listener.onCustomerDeactivated({ customerId: 7 })).rejects.toThrow('boom');
  });
});
