import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const response = this.getResponseBody(exception, req);

    this.logger.error(`${response.method} ${response.path} ${response.message}`, response.stack);

    res.status(response.statusCode).json(response);
  }

  private getResponseBody(exception: any, request: Request) {
    let response: any = {
      statusCode: exception.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
      message: 'Internal server error',
    };

    if (exception.stack) {
      response.stack = exception.stack;
    }

    if (exception.message) {
      if (_.isString(exception.message)) {
        response.message = exception.message;
      }
    }

    if (_.isObject(exception.error)) {
      response = _.extend(response, exception.error);
    }

    if (_.isObject(exception.response)) {
      response = _.extend(response, exception.response);
    }

    if (exception.getResponse) {
      const exceptionResponse = exception.getResponse();

      if (_.isString(exceptionResponse)) {
        response.message = exceptionResponse;
      } else if (exceptionResponse?.statusCode) {
        response = _.extend(response, exception.getResponse());
      } else {
        response = _.extend(response, exceptionResponse);
      }
    }

    return response;
  }
}
