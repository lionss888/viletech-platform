import * as _ from 'lodash';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, ApiResponseOptions, getSchemaPath } from '@nestjs/swagger';
import { PaginateDto } from 'lib/dto/paginate.dto';

export const ApiPaginateHasNextResponse = (DocType: { new () } | { new () }[], response: ApiResponseOptions) => {
  const schema = !_.isArray(DocType) ? getPaginateSchema(DocType) : { oneOf: _.map(DocType, getPaginateSchema) };

  return applyDecorators(ApiExtraModels(PaginateDto), ApiResponse({ ...response, status: 200, schema }));
};

function getPaginateSchema(DocType: { new () }) {
  return {
    properties: {
      docs: {
        type: 'array',
        items: { $ref: getSchemaPath(DocType) },
      },
      hasNext: {
        type: 'boolean',
      },
      page: {
        type: 'number',
      },
      limit: {
        type: 'number',
      },
    },
  };
}
