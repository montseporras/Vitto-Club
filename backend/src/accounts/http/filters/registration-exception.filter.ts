import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
} from '@nestjs/common';
import { AccountsExceptionFilter } from './accounts-exception.filter.js';
import { REGISTRATION_DATA_TAKEN } from '../../application/customer-registration.service.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

function hasErrorCode(exception: unknown, code: string): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { code?: unknown }).code === code
  );
}

// El registro atraviesa dos módulos, así que le pueden llegar errores que el filtro de
// accounts no conoce. Este filtro traduce esos casos y delega todo lo demás en él, para que
// la forma de la respuesta sea la misma:
// - DomainError de customers (por ejemplo, un DNI con formato inválido): es otra clase que la
//   de accounts, así que se reconoce por el nombre. Responde 400 con el campo.
// - Violación de un índice único en la base (P2002): dos registros simultáneos con los mismos
//   datos. Responde el 409 del registro, en vez del mensaje genérico de accounts.
@Catch()
export class RegistrationExceptionFilter implements ExceptionFilter {
  private readonly accountsFilter = new AccountsExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof Error && exception.name === 'DomainError') {
      const field = (exception as { field?: string }).field;
      return this.accountsFilter.catch(
        new BadRequestException({
          message: exception.message,
          ...(field ? { details: [{ field, message: exception.message }] } : {}),
        }),
        host,
      );
    }

    if (hasErrorCode(exception, PRISMA_UNIQUE_VIOLATION)) {
      return this.accountsFilter.catch(new ConflictException(REGISTRATION_DATA_TAKEN), host);
    }

    return this.accountsFilter.catch(exception, host);
  }
}
