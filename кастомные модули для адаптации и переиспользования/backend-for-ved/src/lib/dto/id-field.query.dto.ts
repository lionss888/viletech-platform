import { IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IIdFieldQuery } from 'lib/interfaces/id-field.query.interface';
import { Type } from 'class-transformer';

export class IdFieldQueryDto implements IIdFieldQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  _id?: string;
}
