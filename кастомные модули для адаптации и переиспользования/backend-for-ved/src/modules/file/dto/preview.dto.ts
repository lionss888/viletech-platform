import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PreviewDto {
  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  _id: string;
}

export class PreviewFormDto {
  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  form: string;

  @ApiProperty()
  @Type(() => String)
  @IsNotEmpty()
  filePath: string;
}

export class PreviewOrganizationDto {
  @ApiProperty()
  @Type(() => String)
  @IsNotEmpty()
  contract: string;
}
