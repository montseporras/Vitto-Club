import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

@Catch()
export class CustomerExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unexpected error.';
    let details: { field: string; message: string }[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        message = (bodyObj.message as string) ?? exception.message;
        details = bodyObj.details as { field: string; message: string }[] | undefined;
      }
    } else if (exception instanceof Error) {
      // Errores de validación del dominio (Customer.create()/setters, Mail.create()) llegan como Error simple.
      statusCode = HttpStatus.BAD_REQUEST;
      message = exception.message;
            const field = message.includes('firstName')
        ? 'firstName'
        : message.includes('lastName')
          ? 'lastName'
          : message.includes('documentType')
            ? 'documentType'
            : message.includes('documentNumber')
              ? 'documentNumber'
              : message.includes('dateOfBirth')
                ? 'dateOfBirth'
                : message.includes('phone')
                  ? 'phone'
                  : message.toLowerCase().includes('mail')
                    ? 'email'
                    : 'firstName';

      details = [{ field, message: exception.message }];
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