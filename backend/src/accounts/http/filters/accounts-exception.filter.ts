import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../../domain/errors/domain.error.js';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

// Códigos de error de Prisma con significado conocido
const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_RECORD_NOT_FOUND = 'P2025';

function hasErrorCode(exception: unknown, code: string): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { code?: unknown }).code === code
  );
}

@Catch()
export class AccountsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AccountsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Unexpected error.';
    let details: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        message = (bodyObj.message as string | string[]) ?? exception.message;
        details = bodyObj.details as { field: string; message: string }[] | undefined;
      }
    } else if (exception instanceof DomainError) {
      // Validaciones del dominio (Password, Account): se envió un dato inválido
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.message;
      if (exception.field) {
        details = [{ field: exception.field, message: exception.message }];
      }
    } else if (hasErrorCode(exception, PRISMA_UNIQUE_VIOLATION)) {
      statusCode = HttpStatus.CONFLICT;
      message = 'An account with that identifier already exists';
    } else if (hasErrorCode(exception, PRISMA_RECORD_NOT_FOUND)) {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Account not found';
    } else {
      // Error inesperado (base caída, bug): se registra y se responde genérico, sin filtrar detalles internos
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      );
    }

    response.status(statusCode).json({
      statusCode,
      error: STATUS_NAMES[statusCode] ?? 'Error',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  }
}
