import { Document } from 'mongoose';
import { ISchema } from 'lib/interfaces/schema.interface';

export abstract class BaseSchema extends Document implements ISchema {
  declare _id: string;

  createDate: Date;

  updateDate: Date;
}
