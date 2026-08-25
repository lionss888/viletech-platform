import { IsMongoId, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FileCompressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  originalName: string;

  @IsMongoId()
  @Type(() => String)
  @ApiProperty()
  _id: string;
}

export class CreateZipDto {
  @ValidateNested({ each: true })
  @Type(() => FileCompressDto)
  files: FileCompressDto[];

  @IsNumber()
  @Type(() => Number)
  uid: number;
}
