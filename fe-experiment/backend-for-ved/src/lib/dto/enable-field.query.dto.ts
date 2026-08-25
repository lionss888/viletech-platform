import { IEnableFieldQuery } from 'lib/interfaces/enable-field.query.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { StringToBoolean } from 'lib/utils/transform.utils';

export class EnableFieldQueryDto implements IEnableFieldQuery {
  @ApiProperty({ required: false })
  @IsOptional()
  @StringToBoolean()
  @IsBoolean()
  enable?: boolean;
}
