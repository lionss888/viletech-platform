import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AgentFilesDto {
  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  stamp?: string; // Опциональное поле

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  signature?: string; // Опциональное поле
}
