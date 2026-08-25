import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';

export class TreasurerConfirmPaymentDto {
  @ApiProperty({ required: false, type: String, format: 'date-time' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateReceiptOfCover?: Date;

  @ApiProperty({ required: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  feePaid?: boolean;
}
