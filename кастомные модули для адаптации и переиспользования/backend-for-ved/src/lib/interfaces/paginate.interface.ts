import type { SortOrder } from 'mongoose';
import { IBaseOptions } from '../services/base/base.service.interface';

export type PaginateSort = string | Record<string, SortOrder | { $meta: 'textScore' }> | Array<[string, SortOrder]>;

export interface IPaginateResult<T> {
  docs: Array<T>;
  hasNext: boolean;
  limit: number;
  page?: number;
  offset?: number;
  items?: unknown[];
}

export interface IPaginateOptions {
  select?: object | string;
  sort?: PaginateSort;
  offset?: number;
  page?: number;
  limit?: number;
}

export interface IBasePaginateOptions extends IBaseOptions, IPaginateOptions {}

export interface IPaginateHasNextResult<T> {
  docs: Array<T>;
  hasNext: boolean;
  limit: number;
  page?: number;
  offset?: number;
  items?: unknown[];
}
