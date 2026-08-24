import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StringToBoolean } from 'lib/utils/transform.utils';

export class UploadDto {
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false })
  @StringToBoolean()
  private?: boolean;

  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}
