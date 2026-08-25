import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ICryptoRequisitesOptional, ICryptoRequisites } from 'lib/interfaces/crypto-requisites.interface';

export class CryptoRequisitesDto implements ICryptoRequisites {
  @ApiProperty({ description: 'Сеть криптокошелька' })
  @IsNotEmpty()
  @IsString()
  chain: string;

  @ApiProperty({ description: 'Адрес криптокошелька' })
  @IsNotEmpty()
  @IsString()
  address: string;
}

export class CryptoRequisitesOptionalDto implements ICryptoRequisitesOptional {
  @ApiProperty({ description: 'Сеть криптокошелька' })
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiProperty({ description: 'Адрес криптокошелька' })
  @IsOptional()
  @IsString()
  address?: string;
}
