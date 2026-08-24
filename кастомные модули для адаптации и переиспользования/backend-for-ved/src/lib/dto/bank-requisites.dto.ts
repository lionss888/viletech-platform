import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IRequisites } from 'lib/interfaces/bank-requisites.interface';

export class Requisite implements IRequisites {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bik?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  corrNumber?: string;
}
