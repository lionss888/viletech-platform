import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TreasurerTaskUpdateOrderFileDto {
  @ApiProperty({ description: 'ID файла неподписанного поручения казначея' })
  @IsString()
  @IsNotEmpty()
  fileId: string;
}
