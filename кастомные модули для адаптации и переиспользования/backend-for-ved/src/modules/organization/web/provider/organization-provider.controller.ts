import { Body, Controller, Delete, Get, HttpStatus, Inject, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { IOrganizationService } from '../../service/organization.service.interface';
import { OrganizationDto, OrganizationFullDto } from 'lib/dto/models/organization.dto';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import {
  OrganizationAdminPaginateDto,
  OrganizationAdminQueryDto,
} from 'modules/organization/dto/organization.query.dto';
import { ORGANIZATION_SERVICE } from 'modules/organization/organization.constants';
import { AnyProviderMethod } from 'lib/decorators/any-provider-method.decorator';
import { SeniorProviderMethod } from 'lib/decorators/senior-provider-method.decorator';
import {
  OrganizationProviderCreateDto,
  OrganizationProviderUpdateDto,
} from 'modules/organization/dto/organization-provider.dto';
import { OrganizationType } from 'lib/enums/models/organization.enums';

@ApiCookieAuth()
@ApiTags('provider organization')
@Controller('admin/provider/organization')
export class OrganizationProviderController {
  private readonly logger = new Logger(OrganizationProviderController.name);

  constructor(@Inject(ORGANIZATION_SERVICE) private readonly service: IOrganizationService) {}

  @Get()
  @AnyProviderMethod({ hasNextPaginate: OrganizationDto })
  async findWithPaginate(@Query() dto: OrganizationAdminPaginateDto): Promise<IPaginateHasNextResult<IOrganization>> {
    const { paginate, model } = queryPaginateParser(dto, OrganizationAdminQueryDto);
    const result = await this.service.find(
      { ...model, type: OrganizationType.PROVIDER, isActive: model.isActive ?? true },
      paginate,
    );
    return paginateHasNextPlainToClass(OrganizationDto, result);
  }

  @Get('count')
  @AnyProviderMethod({ response: { status: HttpStatus.OK, type: CountFieldDto } })
  async count(@Query() dto: OrganizationAdminQueryDto): Promise<ICountField> {
    const result = await this.service.count({
      ...dto,
      type: OrganizationType.PROVIDER,
      isActive: dto.isActive ?? true,
    });
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':_id')
  @AnyProviderMethod({ response: { status: HttpStatus.OK, type: OrganizationFullDto } })
  async getOrganization(@Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.findOneOrException(
      { ...dto, type: OrganizationType.PROVIDER, isActive: true },
      { include: ['organizationCard'] },
    );
    return plainModelToClass(OrganizationFullDto, model);
  }

  @Post()
  @SeniorProviderMethod({
    response: { status: HttpStatus.OK, type: OrganizationDto },
    summary: 'Создание организации провайдера',
  })
  async create(@Body() dto: OrganizationProviderCreateDto): Promise<IOrganization> {
    const organization = await this.service.createProviderOrganization(dto);
    return plainModelToClass(OrganizationDto, organization);
  }

  @Patch(':_id')
  @SeniorProviderMethod({
    response: { status: HttpStatus.OK, type: OrganizationDto },
    summary: 'Изменение организации провайдера',
  })
  async update(@Param() dto: IdFieldDto, @Body() updateDto: OrganizationProviderUpdateDto): Promise<IOrganization> {
    const organization = await this.service.updateOneOrException(
      { ...dto, type: OrganizationType.PROVIDER },
      updateDto,
    );
    this.logger.log(`Provider organization updated: ID: ${organization._id}`);
    return plainModelToClass(OrganizationDto, organization);
  }

  @Delete(':_id')
  @SeniorProviderMethod({ response: { status: HttpStatus.NO_CONTENT }, summary: 'Деактивация организации провайдера' })
  async deactivate(@Param() dto: IdFieldDto): Promise<void> {
    this.logger.log(`Provider organization deactivated: ID: ${dto._id}`);
    await this.service.updateOneOrException({ ...dto, type: OrganizationType.PROVIDER }, { isActive: false });
  }
}
