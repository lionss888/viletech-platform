import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BaseDto } from '../base.dto';
import { Type } from 'class-transformer';
import { IContract, IContractBase } from '../../interfaces/models/contract.interface';
import { IFile } from '../../interfaces/models/file.interface';
import { ContractStatus } from '../../enums/models/contract.enums';
import { IAgent } from 'lib/interfaces/models/agent.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { FileDto } from './file.dto';
import { AgentDto } from './agent.dto';
import { IOrganization } from '../../interfaces/models/organization.interface';

export class ContractBaseDto implements IContractBase {
  @ApiProperty({ required: false })
  @Type(() => String)
  @IsMongoId()
  @IsOptional()
  account?: string | IAccount;

  @ApiProperty({ required: false })
  @Type(() => String)
  @IsMongoId()
  @IsOptional()
  agent?: string | IAgent;

  @ApiProperty({ required: false })
  @Type(() => String)
  @IsMongoId()
  @IsOptional()
  organization?: string | IOrganization;

  @ApiProperty({ default: false })
  @IsNotEmpty()
  @IsBoolean()
  isTemplate: boolean;

  @ApiProperty()
  @Type(() => String)
  @IsMongoId()
  @IsNotEmpty()
  file: string | IFile;

  @ApiProperty({ required: false, enum: ContractStatus, enumName: 'ContractStatus' })
  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus;

  @ApiProperty({ required: false })
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number?: string;
}

export class ContractDto extends IntersectionType(ContractBaseDto, BaseDto) implements IContract {}

export class ContractFullDto extends ContractDto implements IContract {
  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  file: IFile;

  @ApiProperty({ required: false, type: AgentDto })
  @IsOptional()
  @Type(() => AgentDto)
  agent?: IAgent;
}
