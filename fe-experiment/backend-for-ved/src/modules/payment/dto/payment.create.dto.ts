import { IPaymentCreateForForm } from '../service/payment.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaymentChargeType } from '../../../lib/enums/models/payment.enums';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { Type } from 'class-transformer';

export class PaymentCreateForFormDto implements IPaymentCreateForForm {
  @ApiProperty({ description: 'Id заявки' })
  @IsString()
  @IsOptional()
  formId?: string;

  @ApiProperty({ description: 'Уникальный идентификатор' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Дата платежа' })
  @IsDateString()
  @IsNotEmpty()
  payDate: string;

  @ApiProperty({ description: 'ИНН организации' })
  @IsString()
  @IsNotEmpty()
  organizationInn: string;

  @ApiProperty({ description: 'ИНН ?' })
  @IsString()
  @IsNotEmpty()
  agentInn: string;

  @ApiProperty({ enum: PaymentChargeType, description: 'Тип платежа' })
  @IsEnum(PaymentChargeType)
  chargeType: PaymentChargeType;

  @ApiProperty({ description: 'Сумма платежа' })
  @IsNumber()
  paymentAmount: number;

  @ApiProperty({ enum: AllCurrencies, description: 'Валюта платежа' })
  @IsEnum(AllCurrencies)
  paymentCurrency: AllCurrencies;

  @ApiProperty({ description: 'Сумма платежа в валюте договора' })
  @IsNumber()
  contractAmount: number;

  @ApiProperty({ enum: AllCurrencies, description: 'Валюта договора' })
  @IsEnum(AllCurrencies)
  contractCurrency: AllCurrencies;
}

export class PaymentCreateManyForFormDto {
  @ApiProperty({ type: [PaymentCreateForFormDto] })
  @Type(() => PaymentCreateForFormDto)
  @ValidateNested({ each: true })
  payments: PaymentCreateForFormDto[];
}
