import { ClassConstructor, deserializeArray, Transform } from 'class-transformer';
import * as _ from 'lodash';
import { stringToBoolean } from './helpers/transform.helper';

export const ValueToArray = () =>
  Transform(({ value }) => {
    if (!value) {
      return;
    }

    return Array.isArray(value) ? value : [value];
  });

export const StringToBoolean = () => Transform(({ value }) => stringToBoolean(value));

export const NumberToString = () =>
  Transform(({ value }) => {
    if (Array.isArray(value)) {
      return _.map(value, (value) => (_.isNumber(value) ? value.toString() : value));
    }
    return _.isNumber(value) ? value.toString() : value;
  });

export const StringToClass = <T>(classType: ClassConstructor<T>) =>
  Transform((params) => (_.isString(params.value) ? deserializeArray(classType, params.value) : params.value));

export const Uniq = () => Transform(({ value }) => _.uniq(value));
