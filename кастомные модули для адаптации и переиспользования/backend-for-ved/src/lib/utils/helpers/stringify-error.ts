import stringify from 'json-stringify-pretty-compact';

export const stringifyError = (e) => {
  const result = stringify(e);
  return result === '{}' ? e : result;
};
