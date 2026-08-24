import { PaginateDto } from '../dto/paginate.dto';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import * as _ from 'lodash';

export const ApiResponsePaginate = (DocType: { new () } | { new () }[]) => {
  const schema = !_.isArray(DocType) ? getPaginateSchema(DocType) : { oneOf: _.map(DocType, getPaginateSchema) };

  return applyDecorators(ApiExtraModels(PaginateDto), ApiResponse({ status: 200, schema }));
};

function getPaginateSchema(DocType: { new () }) {
  return {
    properties: {
      docs: {
        type: 'array',
        items: { $ref: getSchemaPath(DocType) },
      },
      hasNext: { type: 'boolean' },
      page: { type: 'number' },
      limit: { type: 'number' },
    },
  };
}
