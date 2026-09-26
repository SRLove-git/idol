import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { resolveLocale, translateError, translateErrors } from './i18n';

/** 统一 HTTP 异常出口：按 Accept-Language / ?lang 返回中英文提示。 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const locale = resolveLocale(
      request.headers['accept-language'],
      typeof request.query?.lang === 'string' ? request.query.lang : undefined,
    );

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const rawMessage = (raw as Record<string, unknown>).message;
      const message: string | string[] | null =
        typeof rawMessage === 'string'
          ? rawMessage
          : Array.isArray(rawMessage)
            ? rawMessage.filter(
                (item): item is string => typeof item === 'string',
              )
            : null;
      const body: Record<string, unknown> =
        typeof raw === 'string'
          ? {
              statusCode: status,
              message: translateError(raw, locale),
              error: exception.name,
            }
          : {
              ...(raw as Record<string, unknown>),
              message: translateErrors(message, locale),
            };
      httpAdapter.reply(ctx.getResponse(), body, status);
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    // 未捕获异常：记录堆栈，避免 500 在生产环境静默吞掉无法排查
    this.logger.error(
      `未捕获异常 ${request.method} ${request.originalUrl}: ${
        (exception as Error)?.message ?? exception
      }`,
      (exception as Error)?.stack,
    );
    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode: status,
        message: translateError('服务器内部错误', locale),
        error: 'Internal Server Error',
      },
      status,
    );
  }
}
