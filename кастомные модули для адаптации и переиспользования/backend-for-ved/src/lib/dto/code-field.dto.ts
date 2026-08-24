import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ICodeField } from 'lib/interfaces/code-field.interface';

export class CodeFieldDto implements ICodeField {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  code: string;
}
