import { IFormPaymentCreate } from '../service/form-payment.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested, IsArray, IsMongoId, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { FormInvoiceDto } from 'lib/dto/models/form-payment.dto';
import { FormPaymentDirection, FormPaymentPaymentMethod } from 'lib/enums/models/form-payment.enums';

export class FormPaymentCreateDto implements Omit<IFormPaymentCreate, 'account'> {
  @ApiProperty({ required: false, description: 'contract file._id' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  contract?: string;

  @ApiProperty({ required: false, type: [FormInvoiceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FormInvoiceDto)
  invoices?: FormInvoiceDto[];

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Массив ID экспортных сделок со статусом PAYMENT_RECEIVED для привязки к импортной сделке',
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  linkedExportForms?: string[];

  @ApiProperty({ required: false, enum: FormPaymentDirection })
  @IsOptional()
  @IsEnum(FormPaymentDirection)
  direction?: FormPaymentDirection;

  @ApiProperty({ required: false, enum: FormPaymentPaymentMethod, enumName: 'FormPaymentPaymentMethod' })
  @IsEnum(FormPaymentPaymentMethod)
  @IsOptional()
  paymentMethod?: FormPaymentPaymentMethod;
}
