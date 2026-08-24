import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IUIdField } from 'lib/interfaces/uid-field.interface';

export class UIdFieldDto implements IUIdField {
  @IsNumber()
  @ApiProperty()
  uid: string;
}
