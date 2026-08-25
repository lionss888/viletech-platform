import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ITextField } from '../interfaces/text-field.interface';

export class TextFieldDto implements ITextField {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  text: string;
}
