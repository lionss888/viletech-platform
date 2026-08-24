import { IPayment, IPaymentBase, IPaymentData } from '../../interfaces/models/payment.interface';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  PaymentChargeType,
  PaymentEntityType,
  PaymentFrom,
  PaymentStatus,
  PaymentTransactionType,
} from '../../enums/models/payment.enums';
import { AllCurrencies } from '../../enums/common.enums';
import { BaseDto } from '../base.dto';

export class PaymentDataDto implements IPaymentData {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  organizationInn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  agentInn?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  counterpartyInn?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  contractAmount?: number;

  @ApiProperty({ required: false })
  @IsEnum(AllCurrencies)
  @IsOptional()
  contractCurrency?: AllCurrencies;

  @ApiProperty({ required: false, enum: PaymentFrom })
  @IsEnum(PaymentFrom)
  @IsOptional()
  from?: PaymentFrom;
}

export class PaymentBaseDto implements IPaymentBase {
  @ApiProperty()
  @IsDate()
  payDate: Date;

  @ApiProperty()
  @IsEnum(PaymentTransactionType)
  transactionType: PaymentTransactionType;

  @ApiProperty()
  @IsNumber()
  paymentAmount: number;

  @ApiProperty()
  @IsEnum(AllCurrencies)
  paymentCurrency: AllCurrencies;

  @ApiProperty()
  @IsEnum(PaymentChargeType)
  chargeType: PaymentChargeType;

  @ApiProperty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty()
  @IsEnum(PaymentEntityType)
  entityType: PaymentEntityType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiProperty({ required: false, type: PaymentDataDto })
  @ValidateNested()
  @IsOptional()
  data?: PaymentDataDto;
}

export class PaymentDto extends IntersectionType(BaseDto, PaymentBaseDto) implements IPayment {}
