import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

// Mismo patrón que ConsumptionsExceptionFilter (formato de error del contrato, §5): una
// HttpException respeta su status, message y code tal cual (incluido el 403 con su `code`);
// cualquier otra cosa es un error inesperado (por ejemplo, no se pudo generar un código único
// después de 5 intentos, §3.6.1): se registra y se responde 500 genérico.
@Catch()
export class RedemptionsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RedemptionsExceptionFilter.name);

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
