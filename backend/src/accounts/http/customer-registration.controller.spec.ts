import { Reflector } from '@nestjs/core';
import { CustomerRegistrationController } from './customer-registration.controller.js';
import { AccountsService } from '../application/accounts.service.js';
import { IS_PUBLIC_KEY } from '../../shared/security/public.decorator.js';

describe('CustomerRegistrationController', () => {
  it('es público: se puede usar sin iniciar sesión', () => {
    expect(new Reflector().get(IS_PUBLIC_KEY, CustomerRegistrationController)).toBe(true);
  });

  it('pasa los datos al servicio y responde sin tokens', async () => {
    const registerCustomer = jest.fn().mockResolvedValue({
      customerId: 3,
      email: 'lucia@example.com',
      firstName: 'Lucía',
      lastName: 'Fernández',
    });
    const controller = new CustomerRegistrationController({ registerCustomer } as unknown as AccountsService);

    const response = await controller.register({
      firstName: 'Lucía',
      lastName: 'Fernández',
      documentType: 'DNI',
      documentNumber: '40123456',
      email: 'lucia@example.com',
      password: 'secreta123',
    });

    expect(registerCustomer).toHaveBeenCalledWith({
      firstName: 'Lucía',
      lastName: 'Fernández',
      documentType: 'DNI',
      documentNumber: '40123456',
      email: 'lucia@example.com',
      phone: undefined,
      dateOfBirth: undefined,
      password: 'secreta123',
    });
    expect(response).toEqual({
      customerId: 3,
      email: 'lucia@example.com',
      firstName: 'Lucía',
      lastName: 'Fernández',
    });
    expect(response).not.toHaveProperty('accessToken');
  });
});
