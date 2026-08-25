import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';
import { CodeFieldDto } from '../code-field.dto';
import { BaseDto } from '../base.dto';
import { ICode, ICodeBase } from '../../interfaces/models/code.interface';
import { IAccount } from '../../interfaces/models/account.interface';
import { Type } from 'class-transformer';
import { CodeType } from '../../enums/models/code.enums';

export class CodeBaseDto extends CodeFieldDto implements ICodeBase {
  @ApiProperty({ enumName: 'CodeType', enum: CodeType })
  @IsNotEmpty()
  @IsEnum(CodeType)
  type: CodeType;

  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  account: IAccount & string;
}

export class CodeDto extends IntersectionType(CodeBaseDto, BaseDto) implements ICode {}
