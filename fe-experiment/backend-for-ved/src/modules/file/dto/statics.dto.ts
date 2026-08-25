import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IStatics } from '../service/file.service.interface';
import { StaticsType } from 'lib/enums/models/file.enums';

export class StaticsDto implements IStatics {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: StaticsType, enumName: 'StaticsType' })
  @IsNotEmpty()
  @IsEnum(StaticsType)
  type: StaticsType;
}
