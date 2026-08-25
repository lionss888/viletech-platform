import { BasePaginateOptionsDto, PaginateDto } from 'lib/dto/paginate.dto';
import * as _ from 'lodash';
import { plainToClass } from 'class-transformer';
import { ClassConstructor, ClassTransformOptions } from 'class-transformer/types/interfaces';
import { Types } from 'mongoose';
import { IAccount, IAccountQuery, IAccountShort } from 'lib/interfaces/models/account.interface';
import { IBasePaginateOptions, IPaginateHasNextResult, IPaginateResult } from 'lib/interfaces/paginate.interface';
import { IFormPaymentInvoice } from 'lib/interfaces/models/form-payment.interface';

export const queryPaginateParser = function <T extends PaginateDto, E extends object>(
  query: T,
  ctx: ClassConstructor<E>,
  additionalFields?: string[],
): { model: E; paginate: IBasePaginateOptions } {
  const paginateFieldsNames = ['page', 'limit', 'sort', 'select', 'include'];

  if (additionalFields) {
    paginateFieldsNames.push(...additionalFields);
  }
  const model = plainToClass(ctx, _.omit(query, paginateFieldsNames));
  const paginate = plainToClass(BasePaginateOptionsDto, _.pick(query, paginateFieldsNames));
  return { model, paginate };
};

export const paginateHasNextPlainToClass = <T>(
  PlainClass: ClassConstructor<T>,
  paginate: { docs: unknown[]; hasNext: boolean; limit: number; page?: number; offset?: number },
  options?: ClassTransformOptions,
): IPaginateHasNextResult<T> => {
  const docs = _.map(paginate.docs, (doc) => plainModelToClass(PlainClass, doc, options));

  return {
    ...paginate,
    docs,
    items: docs,
  };
};

// Mongoose documents keep ObjectId instances inside nested objects even after toJSON().
// class-transformer tries to instantiate those classes which regenerates new ids at runtime,
// so we normalize every ObjectId to a plain string before passing data to DTOs.
const convertObjectIdsToString = (value: unknown, path: string = 'root'): unknown => {
  try {
    if (_.isNil(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => convertObjectIdsToString(item, `${path}[${index}]`));
    }

    if (value?.constructor?.name === 'ObjectId') {
      try {
        return value.toString();
      } catch (error) {
        throw error;
      }
    }

    if (_.isPlainObject(value)) {
      const result: Record<string, unknown> = {};
      const plainObject = value as Record<string, unknown>;
      for (const key in plainObject) {
        if (Object.prototype.hasOwnProperty.call(plainObject, key)) {
          const val = plainObject[key];
          const currentPath = `${path}.${key}`;
          // Безопасная обработка: если значение undefined или null, пропускаем или сохраняем как есть
          if (_.isNil(val)) {
            result[key] = val;
          } else {
            try {
              result[key] = convertObjectIdsToString(val, currentPath);
            } catch (error) {
              throw error;
            }
          }
        }
      }
      return result;
    }

    return value;
  } catch (error) {
    throw error;
  }
};

const toSerializablePlainObject = (model: unknown) => {
  if (_.isNil(model)) {
    return model;
  }

  const plain =
    typeof model === 'object' &&
    model !== null &&
    'toJSON' in model &&
    typeof (model as { toJSON: () => unknown }).toJSON === 'function'
      ? (model as { toJSON: () => unknown }).toJSON()
      : model;

  return convertObjectIdsToString(plain);
};

export const plainModelToClass = <T>(
  PlainClass: ClassConstructor<T>,
  model: unknown,
  options?: ClassTransformOptions,
): T => {
  try {
    const serialized = toSerializablePlainObject(model);
    return plainToClass(PlainClass, serialized, options);
  } catch (error) {
    throw error;
  }
};

export const plainModelToClassArray = <T, M>(
  PlainClass: ClassConstructor<T>,
  models: M[],
  options?: ClassTransformOptions,
): T[] => {
  return _.map(models, (element) => plainModelToClass(PlainClass, element, options));
};

export const paginatePlainToClass = <T>(
  PlainClass: ClassConstructor<T>,
  paginate: { docs: unknown[]; hasNext: boolean; limit: number; page?: number; offset?: number },
  options?: ClassTransformOptions,
): IPaginateResult<T> => {
  const docs = _.map(paginate.docs, (doc) => plainModelToClass(PlainClass, doc, options));

  return {
    ...paginate,
    docs,
    items: docs,
  };
};

export type AccountQueryField =
  | 'avatar'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'patronymic'
  | 'fullName'
  | 'phone'
  | 'active'
  | 'blocked'
  | 'roles'
  | 'verify'
  | 'lang';
export const queryAccountParser = function <
  E extends object,
  T extends Omit<IAccountQuery, '_id' | '_ids' | 'withoutId'>,
>(query: T, skipFields: AccountQueryField[] = []) {
  const accountQueryFields = _.difference(
    [
      'avatar',
      'email',
      'firstName',
      'lastName',
      'patronymic',
      'fullName',
      'phone',
      'active',
      'blocked',
      'roles',
      'verify',
      'lang',
    ],
    skipFields,
  );

  const anotherQuery = _.omit(query, accountQueryFields) as E;
  const accountQuery = _.pick(query, accountQueryFields) as Omit<IAccountQuery, '_id' | '_ids' | 'withoutId'>;
  return { anotherQuery, accountQuery };
};

export const getIdFromAccount = (account: IAccount | IAccountShort | string | Types.ObjectId) => {
  try {
    if (typeof account === 'string') {
      return account;
    }
    if (account instanceof Types.ObjectId) {
      return account.toString();
    }
    if (account?._id) {
      return account._id.toString();
    }
    throw new Error('Cannot get id from account: account._id is undefined');
  } catch (error) {
    throw error;
  }
};

export const isInvoiceRecognized = (invoice: IFormPaymentInvoice) => {
  return _.chain(invoice).keys().intersection(['recognizeLines', 'recognized']).size().eq(2).value();
};
