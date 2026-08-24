import { IContractAccept, IContractAdminUpdate } from '../service/contract.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ContractQueryAdminDto } from './contract.query.dto';

export class ContractAdminUpdateDto implements IContractAdminUpdate {
  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number?: string;
}

export class ContractAcceptDto extends ContractAdminUpdateDto implements IContractAccept {}

export class ContractRPCUpdateDto {
  @IsNotEmpty()
  @Type(() => ContractQueryAdminDto)
  @ValidateNested()
  query: ContractQueryAdminDto;

  @IsNotEmpty()
  @Type(() => ContractAdminUpdateDto)
  @ValidateNested()
  update: ContractAdminUpdateDto;
}
