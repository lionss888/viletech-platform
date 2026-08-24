import { BadRequestException } from '@nestjs/common';
import * as _ from 'lodash';

const regexDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;

export const parseUrlToDomain = (str?: string): string => {
  let url = str?.replace(/^\w+:\/+|:\d+/g, '') || '';

  if (regexDomain.test(url)) {
    const listNames = url.split('.');

    if (listNames.length > 2) {
      url = listNames.splice(-2).join('.');
    }
  }

  return url;
};

export const valueToType = (value: any, type: 'string' | 'date' | 'number' | 'boolean') => {
  switch (type) {
    case 'boolean':
      return !!value;
    case 'number':
      return +value;
    case 'date':
      return new Date(value);
    case 'string':
      return String(value);
    default:
      throw new BadRequestException(`Type ${type} is not valid`);
  }
};

export const tryValueToType = (value: any, type: 'string' | 'date' | 'number' | 'boolean') => {
  switch (type) {
    case 'boolean':
      if (_.isBoolean(value)) {
        return value;
      }
      if (value === 'true') {
        return true;
      }
      if (value === 'false') {
        return false;
      }
      throw new BadRequestException(`${value} is not a boolean`);
    case 'number':
      const numberValue = +value;
      if (_.isNaN(numberValue)) {
        throw new BadRequestException(`${value} is not a number`);
      }
      return numberValue;
    case 'date':
      const dateValue = new Date(value);

      if (dateValue.toString() === 'Invalid Date') {
        throw new BadRequestException(`${value} is not a Date.`);
      }

      return dateValue;
    case 'string':
      return String(value);
  }
};

export const isMoney = (s: string): boolean => /^((\d+,)|(\d+(,?\d{1,2})?)|(,\d{1,2}))$/.test(s);

export const getWholeAndFractional = (s: string): { whole?: string; fractional?: string } =>
  s.replace(/\s/g, '').match(/^(?<whole>\d+)?,?(?<fractional>\d{1,2})?$/)?.groups || {};

export const getMoneyRegExpPattern = (s: string): string => {
  let { whole, fractional } = getWholeAndFractional(s);

  whole = whole?.replace(/^0+(?!$)/, '');

  if (!whole && !fractional) return;

  if (whole && !fractional) return '^' + whole + (whole !== '0' ? '\\d*' : '') + '$';

  if (!whole && fractional) return '^\\d*' + [...fractional, '\\d'].slice(0, 2).join('') + '$';

  if (whole && fractional)
    return '^' + whole + (['0', '00'].includes(fractional) ? '' : [...fractional, '\\d'].slice(0, 2).join('')) + '$';
};
