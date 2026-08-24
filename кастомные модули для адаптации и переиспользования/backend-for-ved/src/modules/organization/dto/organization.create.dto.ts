import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IOrganizationAdminCreate, IOrganizationSiteCreate } from '../service/organization.service.interface';
import { OrganizationBaseDto } from 'lib/dto/models/organization.dto';
import { Exclude, Type } from 'class-transformer';
import { IsMongoId, IsOptional } from 'class-validator';

export class OrganizationSiteCreateDto
  extends OmitType(OrganizationBaseDto, ['account', 'type', 'status', 'isDeleted'])
  implements IOrganizationSiteCreate
{
  @Exclude()
  account: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  organizationCard?: string;
}

export class OrganizationAdminCreateDto
  extends OmitType(OrganizationBaseDto, ['account', 'status', 'isDeleted'])
  implements IOrganizationAdminCreate
{
  @Exclude()
  account: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  organizationCard?: string;
}
