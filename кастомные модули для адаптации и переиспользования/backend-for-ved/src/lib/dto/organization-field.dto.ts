import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrganizationFieldDto {
  @Type(() => String)
  @IsMongoId()
  @ApiProperty()
  organization: string;
}
