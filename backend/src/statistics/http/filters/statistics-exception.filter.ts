import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StatisticsInputError } from '../../domain/errors/statistics-input.error.js';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
};

// Formato de error del contrato (S5 §5). Deja pasar el 403 con su `code`.
@Catch()
@Injectable()
export class StatisticsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StatisticsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
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
        const bodyObject = body as Record<string, unknown>;
        message = (bodyObject.message as string | string[]) ?? exception.message;
        code = typeof bodyObject.code === 'string' ? bodyObject.code : undefined;
      }
    } else if (exception instanceof StatisticsInputError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.message;
      details = [{ field: exception.field, message: exception.message }];
    } else {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
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
