import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CryptoRequisitesAddDto, CryptoRequisitesRemoveDto } from '../../../lib/dto/models/agent.dto';
import { IAgentUpdateByAdmin } from '../service/agent.service.interface';
import { IDirector } from '../../../lib/interfaces/models/agent.interface';

export class AgentUpdateByAdminDto implements IAgentUpdateByAdmin {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  kpp?: string;

  @ApiProperty({ type: [CryptoRequisitesAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CryptoRequisitesAddDto)
  addCryptoRequisites?: CryptoRequisitesAddDto[];

  @ApiProperty({ type: [CryptoRequisitesRemoveDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CryptoRequisitesRemoveDto)
  removeCryptoRequisites?: CryptoRequisitesRemoveDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Object)
  director?: IDirector;
}
