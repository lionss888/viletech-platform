import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { ISchema } from '../interfaces/schema.interface';
import { Exclude, Expose, Type } from 'class-transformer';

export class BaseDto implements ISchema {
  @Expose()
  @IsMongoId()
  @Type(() => String)
  @ApiProperty()
  _id: string;

  @Expose()
  @ApiProperty()
  createDate: Date;

  @Expose()
  @ApiProperty()
  updateDate: Date;

  @Exclude()
  __v?: number;
}
