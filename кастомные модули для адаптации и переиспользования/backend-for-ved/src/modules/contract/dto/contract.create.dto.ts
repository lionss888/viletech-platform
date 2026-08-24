import {
  IContractAccept,
  IContractCreate,
  IContractCreateTemplate,
  IContractManagerCreate,
} from '../service/contract.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

export class ContractCreateDto implements Omit<IContractCreate, 'account'> {
  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  agent: string;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  organization: string;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  file: string;
}

export class ContractAdminCreateDto implements Omit<IContractManagerCreate, 'adminAccount'> {
  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  agent: string;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  organization: string;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  file: string;

  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  @IsString()
  number: string;
}

export class ContractCreateTemplateDto implements IContractCreateTemplate {
  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  file: string;
}

export class ContractAccept implements IContractAccept {
  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  @IsString()
  number: string;
}

// VF-2: DTO для отправки договора на подписание через Diadoc
export class ContractSignViaDiadocDto {
  @ApiProperty({ required: true, description: 'ИНН получателя (организация или агент)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10}$|^\d{12}$/, { message: 'ИНН должен содержать 10 или 12 цифр' })
  recipientInn: string;
}
