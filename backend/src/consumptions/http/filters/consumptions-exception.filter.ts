import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError } from '../../domain/errors/domain.error.js';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

const PRISMA_RECORD_NOT_FOUND = 'P2025';

function hasErrorCode(exception: unknown, code: string): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { code?: unknown }).code === code
  );
}

// Mismo patrón que accounts/employees/customers (ver AccountsExceptionFilter): HttpException
// respeta su status/message/code/details tal cual; DomainError (reglas de Consumption) se
// mapea a 400; cualquier otra cosa es un error inesperado, se registra y se responde genérico.
@Catch()
export class ConsumptionsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ConsumptionsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Unexpected error.';
    let details: { field: string; message: string }[] | undefined;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        message = (bodyObj.message as string | string[]) ?? exception.message;
        details = bodyObj.details as { field: string; message: string }[] | undefined;
        code = typeof bodyObj.code === 'string' ? bodyObj.code : undefined;
      }
    } else if (exception instanceof DomainError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.message;
      if (exception.field) {
        details = [{ field: exception.field, message: exception.message }];
      }
    } else if (hasErrorCode(exception, PRISMA_RECORD_NOT_FOUND)) {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Consumption not found';
    } else {
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
      ...(code ? { code } : {}),
    });
  }
}
