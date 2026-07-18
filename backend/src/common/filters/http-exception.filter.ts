import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as {
          message?: unknown;
          error?: string;
        };
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
        error = resObj.error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} [Status: ${status}]: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} [Status: ${status}]: ${message}`,
      );
    }

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      let retryAfter = 60;
      if (exceptionResponse && typeof exceptionResponse === 'object') {
        const resObj = exceptionResponse as any;
        if (typeof resObj.retryAfter === 'number') {
          retryAfter = resObj.retryAfter;
        }
      }
      response.setHeader('Retry-After', String(retryAfter));
    }

    let responseMessage = message;
    if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      responseMessage = 'An unexpected error occurred. Please try again later.';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message: responseMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
