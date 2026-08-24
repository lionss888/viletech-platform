import { IIdsField } from 'lib/interfaces/ids-field.interface';
import { IPaginateOptions, IPaginateResult, PaginateSort } from 'lib/interfaces/paginate.interface';
import { ISchema } from 'lib/interfaces/schema.interface';
import { IIdFieldQuery } from 'lib/interfaces/id-field.query.interface';
import { IIdsFieldQuery } from 'lib/interfaces/ids-field.query.interface';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { MongooseBulkWriteOptions } from 'mongoose';
import { BulkWriteResult } from 'mongodb';

export interface IBaseService<
  T extends ISchema,
  Q extends IBaseQuery = IBaseQuery,
  O extends IBaseOptions = IBaseOptions,
  C = Partial<T>,
  U = UpdatePartial<T>,
> {
  create(createData: C, options?: O): Promise<T>;

  find(findData?: Q, options?: IPaginateOptions & O): Promise<IPaginateResult<T>>;

  count(findData?: Q): Promise<ICountField>;

  findOne(findData: Q, options?: O): Promise<T | undefined>;

  findOneOrException(findData: Q, options?: O): Promise<T>;

  findMany(findData: Q, options?: O): Promise<T[]>;

  updateMany(findData: Q, updateData: U): Promise<void>;

  updateOne(findData: Q, updateData: U, options?: O): Promise<T>;

  updateOneOrException(findData: Q, updateData: U, options?: O): Promise<T>;

  exist(findData: Q): Promise<boolean>;

  findIds(findData: Q): Promise<IIdsField>;

  deleteOne(findData: Q): Promise<void>;

  deleteOneOrException(findData: Q): Promise<void>;

  deleteMany(data: Q): Promise<void>;

  bulkWrite(bulkData: any[], options?: MongooseBulkWriteOptions): Promise<BulkWriteResult>;
}

export type OmitBaseSchema<T extends ISchema> = Omit<T, '_id' | 'createDate' | 'updateDate' | '__v'>;

export type UpdatePartial<T extends ISchema> = Partial<OmitBaseSchema<T>>;

export interface IBaseQuery extends IIdFieldQuery, IIdsFieldQuery {
  _id?: string;
  _ids?: string[];
}

export interface IBaseOptions {
  include?: string[];
  select?: object | string;
  sort?: PaginateSort;
}
