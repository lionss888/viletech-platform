import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { BaseDto } from '../base.dto';
import {
  IAgent,
  IAgentBase,
  IAgentCryptoRequisitesAdd,
  IAgentCryptoRequisitesRemove,
  ICryptoRequisites,
  IDirector,
} from '../../interfaces/models/agent.interface';
import { EmailFieldOptionalDto } from '../email-field.dto';
import { PhoneFieldOptionalDto } from '../phone.field.dto';
import { Type } from 'class-transformer';
import { IFile } from '../../interfaces/models/file.interface';
import { Requisite } from '../bank-requisites.dto';

export class DirectorDto implements IDirector {
  @ApiProperty({
    description: 'Краткое имя директора (например: "Иванов И.И.")',
    example: 'Иванов И.И.',
  })
  @IsNotEmpty({ message: 'Краткое имя директора обязательно для заполнения' })
  @IsString({ message: 'Краткое имя директора должно быть строкой' })
  name: string;
}

export class CryptoRequisite implements ICryptoRequisites {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  uuid: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  chain: string;
}

export class AgentBaseDto extends IntersectionType(EmailFieldOptionalDto, PhoneFieldOptionalDto) implements IAgentBase {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  kpp?: string;

  @ApiProperty({ type: [Requisite] })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Requisite)
  requisites: Requisite[];

  @ApiProperty({ type: [CryptoRequisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CryptoRequisite)
  cryproRequisites?: CryptoRequisite[];

  @ApiProperty({ required: true, type: DirectorDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => DirectorDto)
  director: DirectorDto;

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  stamp?: string | IFile; // Опциональное поле

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  signatures?: string | IFile; // Опциональное поле
}

export class CryptoRequisitesAddDto
  extends PickType(CryptoRequisite, ['address', 'chain'])
  implements IAgentCryptoRequisitesAdd {}

export class CryptoRequisitesRemoveDto
  extends PickType(CryptoRequisite, ['uuid'])
  implements IAgentCryptoRequisitesRemove {}

export class AgentDto extends IntersectionType(AgentBaseDto, BaseDto) implements IAgent {}
