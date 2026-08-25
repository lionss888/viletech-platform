import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringToBoolean } from 'lib/utils/transform.utils';
import { IEnableField } from 'lib/interfaces/enable-field.interface';

export class EnableFieldDto implements IEnableField {
  @ApiProperty({ required: false, type: Boolean, default: false })
  @StringToBoolean()
  @IsNotEmpty()
  @IsBoolean()
  enable: boolean;
}
