import mongoose, { FilterQuery, MongooseBulkWriteOptions, PaginateModel, PopulateOptions, UpdateQuery } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from './base.service.interface';
import { IIdsField } from 'lib/interfaces/ids-field.interface';
import { BaseSchema } from './base.schema';
import * as _ from 'lodash';
import { IPaginateOptions, IPaginateResult } from 'lib/interfaces/paginate.interface';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { ISchema } from 'lib/interfaces/schema.interface';
import { BulkWriteResult } from 'mongodb';

export abstract class BaseService<
  I extends ISchema,
  T extends BaseSchema,
  Q extends IBaseQuery = IBaseQuery,
  O extends IBaseOptions = IBaseOptions,
  C = Partial<T>,
  U = UpdatePartial<T>,
> implements IBaseService<I, Q, O, C, U>
{
  protected abstract model: PaginateModel<T>;

  async create(createData: C, options?: O): Promise<I> {
    const populate = this.makePopulate(options);
    const entity = new this.model(createData);
    let model = await entity.save();
    if (populate) {
      model = await model.populate(populate);
    }
    return this.toPlain(model, options);
  }

  async findIds(findData: Q): Promise<IIdsField> {
    const query = await this.makeQuery(findData);
    const _ids: string[] = await this.model.find(query).distinct('_id').exec();
    return { _ids };
  }

  async updateOne(findData: Q, updateData: U, options?: O): Promise<I> {
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);
    const update = this.makeUpdate(updateData);
    const model = (await this.model.findOneAndUpdate(query, update, { new: true }).populate(populate).exec()) as T;

    if (model) {
      return this.toPlain(model, options);
    }
  }

  async updateOneOrException(findData: Q, updateData: U, options?: O): Promise<I> {
    const model = await this.updateOne(findData, updateData, options);
    if (!model) {
      throw new NotFoundException(`${this.model.modelName} not found.`);
    }
    return model;
  }

  async deleteOne(findData: Q): Promise<void> {
    const query = await this.makeQuery(findData);
    await this.model.deleteOne(query).exec();
  }

  async findMany(findData: Q, options?: O): Promise<I[]> {
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);
    const result = await this.model.find(query, options?.select).populate(populate).exec(); //todo
    if (!result.length) {
      return [] as I[];
    }

    return await this.mapMany(result, options);
  }

  async updateMany(findData: Q, updateData: U): Promise<void> {
    const query = await this.makeQuery(findData);
    const update = this.makeUpdate(updateData);
    await this.model.updateMany(query, update as any).exec();
  }

  async deleteOneOrException(findData: Q): Promise<void> {
    const query = await this.makeQuery(findData);
    const model = await this.model.findOne(query).exec();
    if (!model) {
      throw new NotFoundException(`${this.model.modelName} not found.`);
    }
    await this.model.deleteOne(query).exec();
  }

  async find(findData: Q, options?: IPaginateOptions & O): Promise<IPaginateResult<I>> {
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);

    const paginateResult = await this.model.hasNextPaginate(query, { ...options, populate });
    if (!paginateResult.docs.length) {
      return paginateResult as any;
    }

    return {
      ...paginateResult,
      docs: await this.mapMany(paginateResult.docs, options),
    };
  }

  async deleteMany(findData: Q) {
    const query = await this.makeQuery(findData);
    await this.model.deleteMany(query).exec();
  }

  async count(findData?: Q): Promise<ICountField> {
    const query = await this.makeQuery(findData);
    return { count: await this.model.count(query).exec() };
  }

  protected async mapMany(models: T[], options?: any) {
    return await Promise.all(_.map(models, (doc) => this.toPlain(doc, options)));
  }

  async findOne(findData: Q, options?: O): Promise<I | undefined> {
    const query = await this.makeQuery(findData);
    const populate = this.makePopulate(options);
    const model = (await this.model.findOne(query, options?.select, options).populate(populate).exec()) as T;
    if (model) {
      return this.toPlain(model, options);
    }
  }

  async exist(findData: Q): Promise<boolean> {
    const query = await this.makeQuery(findData);
    return !!(await this.model.exists(query).exec());
  }

  async findOneOrException(findData: Q, options?: O): Promise<I> {
    const model = await this.findOne(findData, options);

    if (!model) {
      throw new NotFoundException(`${this.model.modelName} not found.`);
    }

    return model;
  }

  bulkWrite(bulkData: any[], options?: MongooseBulkWriteOptions): Promise<BulkWriteResult> {
    return this.model.bulkWrite(bulkData, options);
  }

  protected async toPlain(model: T, options?: any): Promise<I> {
    let plain: I = model.toJSON({ flattenMaps: false });
    if (options) {
      const plainKeys = _.keys(plain);
      _.forEach(plainKeys, (key) => {
        if (options[key]) {
          plain[key] = options[key];
        }
      });
    }
    return plain;
  }

  protected makePopulate(options?: O): PopulateOptions | (PopulateOptions | string)[] {
    return options?.include;
  }

  protected makeUpdate(data: U): UpdateQuery<T> {
    return data;
  }

  protected async makeQuery({ _ids, ...findData }: Partial<T> & any): Promise<FilterQuery<T>> {
    const result = { ...findData };

    if (_ids) {
      result._id = { $in: _ids };
    }

    if (findData.name) {
      result.name = new RegExp(findData.name, 'g');
    }

    return result as FilterQuery<T>;
  }

  protected flattenUpdateSet(updateData: Record<string, any>): Record<string, any> {
    const newUpdate = { ...updateData };

    if (updateData.$set && typeof updateData.$set === 'object') {
      const newSet: Record<string, any> = {};

      for (const [key, value] of Object.entries(updateData.$set)) {
        const isPlainObject =
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          !(value instanceof mongoose.Types.ObjectId) &&
          Object.getPrototypeOf(value) === Object.prototype;

        if (isPlainObject) {
          for (const [subKey, subValue] of Object.entries(value)) {
            newSet[`${key}.${subKey}`] = subValue;
          }
        } else {
          newSet[key] = value;
        }
      }

      newUpdate.$set = newSet;
    }

    return newUpdate;
  }
}
