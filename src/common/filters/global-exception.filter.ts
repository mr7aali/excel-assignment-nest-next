import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

type ErrorDetails = string | string[] | Record<string, unknown>;

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  error?: ErrorDetails;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: ErrorResponseBody) => void };
    }>();
    const request = ctx.getRequest<{ url: string }>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const normalizedError = this.normalizeError(exceptionResponse);
    const message = this.resolveMessage(exception, normalizedError);

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(normalizedError !== undefined ? { error: normalizedError } : {}),
    });
  }

  private normalizeError(response: unknown): ErrorDetails | undefined {
    if (response === undefined || response === null) {
      return undefined;
    }

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object') {
      const record = response as Record<string, unknown>;
      if (this.isErrorDetails(record.message)) {
        return record.message;
      }

      if (this.isErrorDetails(record.error)) {
        return record.error;
      }
    }

    return undefined;
  }

  private resolveMessage(
    exception: unknown,
    normalizedError?: ErrorDetails,
  ): string {
    if (exception instanceof HttpException) {
      if (Array.isArray(normalizedError)) {
        return normalizedError[0] ?? 'Request failed';
      }

      if (typeof normalizedError === 'string' && normalizedError.length > 0) {
        return normalizedError;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private isErrorDetails(value: unknown): value is ErrorDetails {
    return (
      typeof value === 'string' ||
      Array.isArray(value) ||
      (typeof value === 'object' && value !== null)
    );
  }
}
