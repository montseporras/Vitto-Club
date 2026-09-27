import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EmployeesExceptionFilter } from './employees-exception.filter.js';
import { DomainError } from '../../domain/errors/domain.error.js';

describe('EmployeesExceptionFilter', () => {
  let filter: EmployeesExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter = new EmployeesExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/empleados' }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => jest.restoreAllMocks());

  const body = () => json.mock.calls[0][0];

  it('un DomainError con campo responde 400 con details', () => {
    filter.catch(new DomainError('Employee phone is invalid', 'phone'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Employee phone is invalid',
      path: '/api/empleados',
      details: [{ field: 'phone', message: 'Employee phone is invalid' }],
    });
  });

  it('respeta los mensajes del ValidationPipe (400 con lista de errores)', () => {
    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(body().message).toEqual(['email must be an email']);
  });

  it('un email duplicado (ConflictException) responde 409', () => {
    filter.catch(new ConflictException('Employee with email "a@b.com" already exists'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().error).toBe('Conflict');
  });

  it('un empleado inexistente (NotFoundException) responde 404', () => {
    filter.catch(new NotFoundException('Employee with ID 9 not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(body()).toMatchObject({ error: 'Not Found', message: 'Employee with ID 9 not found' });
  });

  it('un registro inexistente de Prisma (P2025) responde 404', () => {
    filter.catch(Object.assign(new Error('Record not found'), { code: 'P2025' }), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(body().message).toBe('Employee not found');
  });

  it('una violación de unicidad de Prisma (P2002) responde 409', () => {
    filter.catch(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(body().message).toBe('An employee with that email already exists');
  });

  it('un error inesperado responde 500 genérico y NO filtra el mensaje interno', () => {
    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:5433 (password=secreto)'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(body().message).toBe('Unexpected error.');
    expect(JSON.stringify(body())).not.toContain('ECONNREFUSED');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
