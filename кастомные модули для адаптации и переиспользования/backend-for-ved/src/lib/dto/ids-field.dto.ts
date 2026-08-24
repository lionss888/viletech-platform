import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsMongoId, IsNotEmpty } from 'class-validator';
import { IIdsField } from 'lib/interfaces/ids-field.interface';
import { Transform, Type } from 'class-transformer';
import * as _ from 'lodash';

export class IdsFieldDto implements IIdsField {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => (_.isArray(value) ? value : value.split(',')))
  @ArrayMaxSize(1000)
  @Type(() => String)
  @IsMongoId({ each: true })
  _ids: string[];
}
