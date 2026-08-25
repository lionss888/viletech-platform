import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBodyOptions,
  ApiHeaders,
  ApiOperation,
  ApiParam,
  ApiParamOptions,
  ApiQuery,
  ApiQueryOptions,
  ApiResponse,
  ApiResponseOptions,
} from '@nestjs/swagger';
import { ApiResponsePaginate } from './api-response-paginate.decorator';
import { ApiHeaderOptions } from '@nestjs/swagger/dist/decorators/api-header.decorator';
import * as _ from 'lodash';
import { ApiPaginateHasNextResponse } from 'lib/decorators/api-paginate-has-next-response.decorator';

export interface MethodOptions {
  params?: ApiParamOptions;
  response?: ApiResponseOptions;
  body?: ApiBodyOptions;
  query?: ApiQueryOptions;
  headers?: ApiHeaderOptions[];
  paginate?: { new () } | { new () }[];
  hasNextPaginate?: { new () } | { new () }[];
  metadata?: { key: string; value: any }[];
  summary?: string;
  decorators?: MethodDecorator[];
}

export const Method = (options: MethodOptions) => {
  const decorators: MethodDecorator[] = [
    ApiHeaders([
      ...(options.headers ?? []),
      { name: 'origin', required: false },
      {
        name: 'x-language',
        required: false,
      },
    ]),
    ...(options.decorators || []),
  ];

  decorators.push(ApiBearerAuth());

  if (options.summary) {
    decorators.push(ApiOperation({ summary: options.summary }));
  }

  if (options.metadata?.length) {
    _.each(options.metadata, ({ key, value }) => decorators.push(SetMetadata(key, value)));
  }

  if (options.params) {
    decorators.push(ApiParam(options.params));
  }

  if (options.response) {
    decorators.push(ApiResponse(options.response));
  }

  if (options.body) {
    decorators.push(ApiBody(options.body));
  }

  if (options.query) {
    decorators.push(ApiQuery(options.query));
  }

  if (options.paginate) {
    decorators.push(ApiResponsePaginate(options.paginate));
  }

  if (options.hasNextPaginate) {
    decorators.push(ApiPaginateHasNextResponse(options.hasNextPaginate, options.response));
  }

  return applyDecorators(...decorators);
};
