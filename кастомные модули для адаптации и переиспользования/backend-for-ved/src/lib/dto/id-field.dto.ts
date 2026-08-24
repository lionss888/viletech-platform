import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IIdField } from 'lib/interfaces/id-field.interface';
import { Type } from 'class-transformer';

export class IdFieldDto implements IIdField {
  @Type(() => String)
  @IsMongoId()
  @ApiProperty()
  _id: string;
}
