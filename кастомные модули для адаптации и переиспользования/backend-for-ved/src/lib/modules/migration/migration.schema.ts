import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MigrationStatus } from 'lib/enums/migration.enums';
import { BaseSchema } from 'lib/services/base/base.schema';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'migrations',
})
export class Migration extends BaseSchema {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, type: String, enum: MigrationStatus })
  status: MigrationStatus;

  @Prop({ required: false })
  errorMessage?: string;
}

export const MigrationSchema = SchemaFactory.createForClass(Migration);
