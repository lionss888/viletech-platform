import { OmitType, PartialType } from '@nestjs/swagger';
import { FormInvoiceDto } from 'lib/dto/models/form-payment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

// DTO for adding invoice: forbid hsCode and uuid input
export class AddInvoiceDto extends OmitType(FormInvoiceDto, ['hsCode', 'uuid'] as const) {}

// DTO for updating invoice: all fields optional, forbid hsCode and uuid
export class UpdateInvoiceDto extends PartialType(AddInvoiceDto) {}

export class RemoveInvoiceParamDto {
  @ApiProperty({ description: 'Invoice UUID' })
  @IsUUID()
  @IsNotEmpty()
  uuid: string;
}
