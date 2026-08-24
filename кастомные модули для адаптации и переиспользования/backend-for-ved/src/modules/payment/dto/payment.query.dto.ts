import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { PaginateDto } from '../../../lib/dto/paginate.dto';
import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { StringToBoolean } from '../../../lib/utils/transform.utils';
import { PaymentFrom } from '../../../lib/enums/models/payment.enums';

export class PaymentSiteQueryDto {}

export class PaymentAdminQueryDto extends PaymentSiteQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationInnLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  isEntityAssigned?: boolean;

  @ApiProperty({ required: false, enum: PaymentFrom })
  @IsEnum(PaymentFrom)
  @IsOptional()
  paymentFrom: PaymentFrom;
}

export class PaymentAdminPaginateDto extends IntersectionType(PaymentAdminQueryDto, PaginateDto) {}

export class PaymentManagerQueryDto extends PaymentSiteQueryDto {}

export class PaymentManagerPaginateDto extends IntersectionType(PaymentManagerQueryDto, PaginateDto) {}

export class PaymentOneCQueryDto extends PaymentSiteQueryDto {
  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateGte?: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateLt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isEntityAssigned?: boolean;
}

export class PaymentOneCPaginateDto extends IntersectionType(PaymentOneCQueryDto, PaginateDto) {}
