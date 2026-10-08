import { ArgumentsHost, ConflictException } from '@nestjs/common';
import { RegistrationExceptionFilter } from './registration-exception.filter.js';
import { REGISTRATION_DATA_TAKEN, REGISTRATION_EMAIL_TAKEN } from '../../application/customer-registration.service.js';

// Un DomainError de otro módulo (customers): misma forma, otra clase
class CustomersDomainError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

describe('RegistrationExceptionFilter', () => {
  const filter = new RegistrationExceptionFilter();
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;
  const body = () => json.mock.calls[0][0];

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/registro' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('un DomainError de customers responde 400 con el campo', () => {
    filter.catch(new CustomersDomainError('Customer DNI must have 7 or 8 digits', 'documentNumber'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      message: 'Customer DNI must have 7 or 8 digits',
      details: [{ field: 'documentNumber', message: 'Customer DNI must have 7 or 8 digits' }],
    });
  });

  it('una violación de unicidad de la base (P2002) responde el 409 del registro', () => {
    filter.catch(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().message).toBe(REGISTRATION_DATA_TAKEN);
  });

  it('el 409 del registro conserva el campo repetido', () => {
    filter.catch(
      new ConflictException({
        message: REGISTRATION_EMAIL_TAKEN,
        details: [{ field: 'email', message: REGISTRATION_EMAIL_TAKEN }],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(body()).toMatchObject({
      message: REGISTRATION_EMAIL_TAKEN,
      details: [{ field: 'email', message: REGISTRATION_EMAIL_TAKEN }],
    });
  });

  it('un error inesperado responde 500 genérico, sin detalles internos', () => {
    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:5433'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(body().message).toBe('Unexpected error.');
  });
});
