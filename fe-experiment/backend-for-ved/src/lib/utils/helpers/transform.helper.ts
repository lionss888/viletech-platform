import * as _ from 'lodash';

export const stringToBoolean = (value: any) => {
  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return value;
  }
};

export function stringsToTelegramUsername(value: string[]): string {
  return _.chain(value)
    .compact()
    .uniq()
    .map((s) => s.trim().replace(/^(?!@)/, '@'))
    .join(' ')
    .value();
}
