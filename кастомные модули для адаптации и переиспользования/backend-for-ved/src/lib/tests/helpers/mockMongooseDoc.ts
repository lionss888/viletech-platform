import _ from 'lodash';

export function mockMongooseDoc(data: any) {
  if (_.isArray(data)) {
    return wrapWithToJSON(data);
  }

  return {
    ...data,
    toJSON: () => data,
  };
}

function wrapWithToJSON<T extends object>(items: T[]): (T & { toJSON: () => T })[] {
  return items.map((item) => ({
    ...item,
    toJSON: () => ({ ...item }),
  }));
}
