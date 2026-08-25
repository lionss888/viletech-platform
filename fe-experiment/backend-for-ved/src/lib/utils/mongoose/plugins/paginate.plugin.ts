import * as mongoose from 'mongoose';
import * as _ from 'lodash';

async function hasNextPaginate(findData, options) {
  const select = options.select || '';
  let sort = options.sort || '';
  let populate = options.populate || '';
  let limit = _.isNumber(options.limit) && options.limit > 0 ? options.limit : 10;
  let page, offset, skip;
  if (options.offset) {
    offset = options.offset;
    skip = offset;
  } else if (options.page) {
    page = options.page;
    skip = (page - 1) * limit;
  } else {
    page = 1;
    offset = 0;
    skip = offset;
  }

  const docs = await this.find(findData)
    .select(select)
    .sort(sort)
    .skip(skip)
    .populate(populate)
    .limit(limit + 1)
    .exec();

  let hasNext = docs.length > limit;
  if (hasNext) {
    docs.pop();
  }

  return { docs, hasNext, limit, offset, page };
}

export function paginatePlugin(schema: mongoose.Schema) {
  schema.statics.hasNextPaginate = hasNextPaginate;
}
