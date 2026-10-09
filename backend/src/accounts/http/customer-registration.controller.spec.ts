import { Reflector } from '@nestjs/core';
import { CustomerRegistrationController } from './customer-registration.controller.js';
import { CustomerRegistrationService } from '../application/customer-registration.service.js';
import { IS_PUBLIC_KEY } from '../../shared/security/public.decorator.js';

describe('CustomerRegistrationController', () => {
  it('es público: se puede usar sin iniciar sesión', () => {
    expect(
      new Reflector().get(IS_PUBLIC_KEY, CustomerRegistrationController),
    ).toBe(true);
  });

  it('pasa los datos al servicio y responde sin tokens', async () => {
    const register = jest.fn().mockResolvedValue({
      customerId: 3,
      email: 'lucia@example.com',
      firstName: 'Lucía',
      lastName: 'Fernández',
    });
    const audit = {
      capture: jest.fn().mockImplementation(async (operation, createEntry) => {
        const result = await operation();
        createEntry(result);
        return result;
      }),
    };
    const controller = new CustomerRegistrationController(
      { register } as unknown as CustomerRegistrationService,
      audit as never,
    );

    const response = await controller.register({
      firstName: 'Lucía',
      lastName: 'Fernández',
      documentType: 'DNI',
      documentNumber: '40123456',
      email: 'lucia@example.com',
      password: 'secreta123',
    });

    expect(register).toHaveBeenCalledWith({
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
    expect(
      audit.capture.mock.calls[0][1]({
        customerId: 3,
        email: 'lucia@example.com',
        firstName: 'Lucía',
        lastName: 'Fernández',
      }),
    ).toEqual({
      performedBy: 'Lucía Fernández',
      category: 'CUSTOMERS',
      action: 'Autorregistro de cliente',
      documentType: 'DNI',
      documentNumber: '40123456',
      details: { customerId: 3 },
    });
  });
});
