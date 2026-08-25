import mongoose from 'mongoose';
import _ from 'lodash';

export const numberFloorPropOptions = {
  get: (v) => Math.floor(v),
  set: (v) => Math.floor(v),
};

export const castBigIntString = (val: any): any => (typeof val === 'bigint' ? val.toString() : BigInt(val));

export const mapFieldsToBigInt = (value: Record<string, any>, fields: string[]) =>
  _.chain(value)
    .pick(fields)
    .mapValues((value) => (typeof value === 'bigint' ? value : BigInt(value)))
    .value();

export const bigIntToJson = (value: Record<string, any>, fields: string[]) => {
  return {
    ...value,
    ...mapFieldsToBigInt(value, fields),
  };
};

export const bigIntDecimalArrayPropOptions = {
  get: (fn) => (fn && fn.length ? fn.map((i) => i.toString()) : fn),
  set: (value: any) => (value && value.length ? value.map((i) => new mongoose.Types.Decimal128(i.toString())) : 0),
  transform: (fn) => fn,
  type: mongoose.Types.Decimal128,
};

export const bigIntPropDecimalOptions = {
  get: (fn) => (fn ? fn.toString() : fn),
  set: (value: any) => (value ? new mongoose.Types.Decimal128(value.toString()) : 0),
  transform: (fn) => fn,
  type: mongoose.Types.Decimal128,
};

export const bigIntPropOptions = {
  get: (fn) => (fn ? BigInt(fn) : fn),
  set: (fn) => fn?.toString(),
  transform: (fn) => fn,
  type: mongoose.Schema.Types.String,
};
