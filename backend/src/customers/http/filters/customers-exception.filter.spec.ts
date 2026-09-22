import { ArgumentsHost, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { CustomerExceptionFilter } from './customers-exception.filter.js';
import { DomainError } from '../../domain/errors/domain.error.js';

describe('CustomerExceptionFilter', () => {
  let filter: CustomerExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter = new CustomerExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/customers/1' }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => jest.restoreAllMocks());

  const body = () => json.mock.calls[0][0];

  it('un DomainError con campo responde 400 con details', () => {
    filter.catch(new DomainError('Customer phone is invalid', 'phone'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Customer phone is invalid',
      details: [{ field: 'phone', message: 'Customer phone is invalid' }],
    });
  });

  it('un DomainError sin campo responde 400 sin details', () => {
    filter.catch(new DomainError('Customer is already inactive'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body().details).toBeUndefined();
  });

  it('respeta el estado de las HttpException (404, 409)', () => {
    filter.catch(new NotFoundException('Customer with ID 9 not found'), host);
    expect(status).toHaveBeenLastCalledWith(404);

    filter.catch(new ConflictException('duplicado'), host);
    expect(status).toHaveBeenLastCalledWith(409);
  });

  it('un error inesperado responde 500 genérico y NO filtra el mensaje interno', () => {
    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:5433 (password=secreto)'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(body().message).toBe('Unexpected error.');
    expect(JSON.stringify(body())).not.toContain('ECONNREFUSED');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('un TypeError (bug) responde 500 y no 400', () => {
    filter.catch(new TypeError("Cannot read properties of null (reading 'trim')"), host);

    expect(status).toHaveBeenCalledWith(500);
  });

  it('una violación de unicidad de Prisma (P2002) responde 409', () => {
    filter.catch(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().message).toBe('A customer with that document already exists');
  });

  it('un registro inexistente de Prisma (P2025) responde 404', () => {
    filter.catch(Object.assign(new Error('Record not found'), { code: 'P2025' }), host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('un valor que no es Error también responde 500', () => {
    filter.catch('algo raro', host);

    expect(status).toHaveBeenCalledWith(500);
  });
});
