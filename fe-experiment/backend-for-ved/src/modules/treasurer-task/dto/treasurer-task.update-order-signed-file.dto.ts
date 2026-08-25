import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TreasurerTaskUpdateOrderSignedFileDto {
    @ApiProperty({ description: 'ID файла подписанного поручения казначея' })
    @IsString()
    @IsNotEmpty()
    fileId: string;
}

