import { ApiProperty, OmitType, PickType } from '@nestjs/swagger';
import { ICodeCreate, ICodeCreateFull, ICodeCreateManyFull } from '../service/code.service.interface';
import { CodeBaseDto, CodeDto } from 'lib/dto/models/code.dto';
import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CodeCreateDto extends PickType(CodeDto, ['account', 'type'] as const) implements ICodeCreate {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class CodeCreateFullDto extends OmitType(CodeBaseDto, ['code'] as const) implements ICodeCreateFull {
  @IsNotEmpty()
  @IsString()
  hash: string;

  @IsNotEmpty()
  @IsString()
  salt: string;
}

export class CodeCreateManyFullDto implements ICodeCreateManyFull {
  @IsNotEmpty()
  @Type(() => CodeCreateFullDto)
  @ValidateNested({ each: true })
  data: CodeCreateFullDto[];
}
