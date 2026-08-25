import { ICurrencyQuery } from '../service/currency.service.interface';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { StringToBoolean, ValueToArray } from 'lib/utils/transform.utils';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { AllCurrencies } from 'lib/enums/common.enums';
import { Transform, Type } from 'class-transformer';
import { CurrencySource, RateStrategy } from 'lib/enums/models/currency.enums';
import { stringToBoolean } from 'lib/utils/helpers/transform.helper';

export class CurrencyQueryDto implements ICurrencyQuery {
  @ApiProperty({ required: false, type: [AllCurrencies], enum: AllCurrencies, enumName: 'AllCurrencies' })
  @IsArray()
  @ValueToArray()
  @IsOptional()
  @IsEnum(AllCurrencies, { each: true })
  symbols?: AllCurrencies[];
}

export class CurrencyPaginateDto extends IntersectionType(CurrencyQueryDto, PaginateDto) {}

export class CurrencyAdminQueryDto
  extends IntersectionType(CurrencyQueryDto, IdFieldQueryDto)
  implements ICurrencyQuery
{
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  _ids?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(AllCurrencies)
  symbol?: AllCurrencies;
}

export class CurrencyAdminPaginateDto extends IntersectionType(CurrencyAdminQueryDto, PaginateDto) {}

export class CurrencyFindQueryDto extends CurrencyAdminQueryDto implements ICurrencyQuery {}
export class CurrencyFindPaginateDto extends IntersectionType(CurrencyFindQueryDto, PaginateDto) {}

export class CurrencyRateWithBaseSiteQueryDto {
  @ApiProperty({ required: true })
  @IsEnum(AllCurrencies)
  target: AllCurrencies;
}

export class CurrencyRateWithBaseAdminQueryDto extends CurrencyRateWithBaseSiteQueryDto {
  @ApiProperty()
  @IsEnum(RateStrategy)
  strategy: RateStrategy;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  inverse?: boolean;

  @ApiProperty({ required: false, enum: CurrencySource })
  @IsOptional()
  @IsEnum(CurrencySource)
  source?: CurrencySource;

  @ApiProperty({ required: false, enum: CurrencySource })
  @IsOptional()
  @IsArray()
  @IsEnum(CurrencySource, { each: true })
  sources?: CurrencySource[];
}
