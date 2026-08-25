import * as _ from 'lodash';

export const makeMinMaxQuery = (min?: number, max?: number) => {
  if (!_.isNumber(min) && !_.isNumber(max)) {
    return;
  }

  const query: any = {};

  if (_.isNumber(min)) {
    query.$gte = min;
  }

  if (_.isNumber(max)) {
    query.$lte = max;
  }

  return query;
};
