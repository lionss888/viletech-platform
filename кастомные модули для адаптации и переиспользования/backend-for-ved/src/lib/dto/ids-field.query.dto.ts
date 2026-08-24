import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { IIdsFieldQuery } from 'lib/interfaces/ids-field.query.interface';
import { Type } from 'class-transformer';

export class IdsFieldQueryDto implements IIdsFieldQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  _ids?: string[];
}
