// Type definitions for mongoose-paginate 5.0.0
// Project: https://github.com/edwardhotchkiss/mongoose-paginate
// Definitions by: Linus Brolin <https://github.com/linusbrolin>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 4.1

/// <reference types="mongoose" />

import { PopulateOptions } from 'mongoose';

declare module 'mongoose' {
  export interface PaginateHasNextOptions {
    select?: Object | string;
    sort?: Object | string;
    limit?: number;
    offset?: number;
    page?: number;
    populate?: PopulateOptions | (PopulateOptions | string)[];
  }

  export interface PaginateHasNextResult<T> {
    docs: Array<T>;
    hasNext: boolean;
    limit: number;
    page?: number;
    offset?: number;
  }

  interface PaginateModel<T extends Document> extends Model<T> {
    hasNextPaginate(query?: FilterQuery<T>, options?: PaginateHasNextOptions): Promise<PaginateHasNextResult<T>>;
  }

  export function model<T extends Document>(
    name: string,
    schema?: Schema,
    collection?: string,
    skipInit?: boolean,
  ): PaginateModel<T>;

  export function model<T extends Document, U extends PaginateModel<T>>(
    name: string,
    schema?: Schema,
    collection?: string,
    skipInit?: boolean,
  ): U;
}
