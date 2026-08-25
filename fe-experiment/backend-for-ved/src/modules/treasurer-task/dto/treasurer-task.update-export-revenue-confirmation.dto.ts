import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TreasurerTaskUpdateExportRevenueConfirmationDto {
    @ApiProperty({ description: 'ID файла подтверждения выплаты по экспортной выручке' })
    @IsString()
    @IsNotEmpty()
    fileId: string;
}

