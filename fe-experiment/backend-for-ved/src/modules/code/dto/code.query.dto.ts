import { ICodeQuery } from '../service/code.service.interface';

export class CodeQueryDto implements ICodeQuery {
  // @ApiProperty({ enumName: 'CodeType', enum: CodeType, required: false })
  // @IsOptional()
  // @IsEnum(CodeType)
  // type?: CodeType;
  //
  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsMongoId()
  // @Type(() => String)
  // account?: string;
}
