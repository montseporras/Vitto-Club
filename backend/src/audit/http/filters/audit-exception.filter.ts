import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { InvalidAuditFilterError } from '../../domain/errors/invalid-audit-filter.error.js';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  500: 'Internal Server Error',
};

// Formato de error de la §5 del contrato. Deja pasar el `code` y el `details` de las
// HttpException, incluido el 403 de los roles. Un filtro inválido es un 400; cualquier otro
// error es inesperado y se responde genérico, sin filtrar detalles internos.
@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuditExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocurrió un error inesperado.';
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
    } else if (exception instanceof InvalidAuditFilterError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.message;
      if (exception.field) {
        details = [{ field: exception.field, message: exception.message }];
      }
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
