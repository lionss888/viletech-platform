import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { BaseDto } from '../base.dto';
import { IVirtualAccount } from '../../interfaces/models/virtual-account.interface';
import { AllCurrencies } from '../../enums/common.enums';
import { VirtualAccountType } from '../../enums/models/virtual-account.enums';
import { Exclude, Type } from 'class-transformer';
import { AccountShortDto } from './account.dto';
import { IAccount } from '../../interfaces/models/account.interface';

export class VirtualAccountBaseDto implements Omit<IVirtualAccount, '_id' | 'createDate' | 'updateDate' | '__v'> {
  @ApiProperty({ enum: AllCurrencies, enumName: 'AllCurrencies' })
  @IsNotEmpty()
  @IsEnum(AllCurrencies)
  currency: AllCurrencies;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  available: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  reserved: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalBalance: number;

  @ApiProperty({ enum: VirtualAccountType, enumName: 'VirtualAccountType' })
  @IsNotEmpty()
  @IsEnum(VirtualAccountType)
  type: VirtualAccountType;

  @Exclude()
  @ApiProperty({ type: AccountShortDto })
  @Type(() => AccountShortDto)
  account: string | IAccount;
}

export class VirtualAccountDto extends IntersectionType(BaseDto, VirtualAccountBaseDto) implements IVirtualAccount {}
