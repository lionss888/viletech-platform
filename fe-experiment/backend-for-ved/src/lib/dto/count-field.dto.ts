import { ICountField } from '../interfaces/count-field.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CountFieldDto implements ICountField {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  count: number;
}
