import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountsExceptionFilter } from './accounts-exception.filter.js';
import { DomainError } from '../../domain/errors/domain.error.js';

describe('AccountsExceptionFilter', () => {
  let filter: AccountsExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter = new AccountsExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/usuarios' }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => jest.restoreAllMocks());

  const body = () => json.mock.calls[0][0];

  it('un DomainError con campo responde 400 con details', () => {
    filter.catch(new DomainError('Password must have at least 8 characters', 'password'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Password must have at least 8 characters',
      path: '/api/usuarios',
      details: [{ field: 'password', message: 'Password must have at least 8 characters' }],
    });
  });

  it('respeta los mensajes del ValidationPipe (400 con lista de errores)', () => {
    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body().message).toEqual(['email must be an email']);
  });

  it('"al menos uno de role o password" (BadRequestException del controller) responde 400', () => {
    filter.catch(new BadRequestException('At least one of role or password must be provided'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body().message).toBe('At least one of role or password must be provided');
  });

  it('último ADMIN disponible (ConflictException) responde 409', () => {
    filter.catch(
      new ConflictException('This operation would leave the system without an available administrator'),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(body().error).toBe('Conflict');
  });

  it('una cuenta inexistente (NotFoundException) responde 404', () => {
    filter.catch(new NotFoundException('Account with ID 9 not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(body()).toMatchObject({ error: 'Not Found', message: 'Account with ID 9 not found' });
  });

  it('un registro inexistente de Prisma (P2025) responde 404', () => {
    filter.catch(Object.assign(new Error('Record not found'), { code: 'P2025' }), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(body().message).toBe('Account not found');
  });

  it('una violación de unicidad de Prisma (P2002) responde 409', () => {
    filter.catch(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().message).toBe('An account with that identifier already exists');
  });

  it('un error inesperado responde 500 genérico y NO filtra el mensaje interno', () => {
    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:5433 (password=secreto)'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(body().message).toBe('Unexpected error.');
    expect(JSON.stringify(body())).not.toContain('ECONNREFUSED');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
