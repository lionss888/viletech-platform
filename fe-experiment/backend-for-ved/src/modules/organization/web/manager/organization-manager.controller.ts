import { Body, Controller, Delete, Get, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common';
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
import { OrganizationAdminCreateDto } from 'modules/organization/dto/organization.create.dto';
import { OrganizationAdminUpdateDto } from 'modules/organization/dto/organization.update.dto';
import { ManagerMethod } from 'lib/decorators/manager-method.decorator';
import { ORGANIZATION_SERVICE } from 'modules/organization/organization.constants';

@ApiCookieAuth()
@ApiTags('manager organization')
@Controller('admin/manager/organization')
export class OrganizationManagerController {
  constructor(@Inject(ORGANIZATION_SERVICE) private readonly service: IOrganizationService) {}

  @Get()
  @ManagerMethod({ hasNextPaginate: OrganizationDto })
  async findWithPaginate(@Query() dto: OrganizationAdminPaginateDto): Promise<IPaginateHasNextResult<IOrganization>> {
    const { paginate, model } = queryPaginateParser(dto, OrganizationAdminQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(OrganizationDto, result);
  }

  @Get(':_id')
  @ManagerMethod({ response: { status: 200, type: OrganizationFullDto } })
  async getOrganization(@Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.findOneOrException(dto, { include: ['organizationCard'] });
    return plainModelToClass(OrganizationFullDto, model);
  }

  @Get('count')
  @ManagerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: OrganizationAdminQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Post()
  @ManagerMethod({ response: { status: 200, type: OrganizationDto }, summary: 'Создание организации' })
  async create(@Body() dto: OrganizationAdminCreateDto): Promise<IOrganization> {
    const organization = await this.service.create(dto);
    return plainModelToClass(OrganizationDto, organization);
  }

  @Patch(':_id')
  @ManagerMethod({
    response: {
      status: HttpStatus.OK,
      type: OrganizationAdminUpdateDto,
      description: 'Organization data updated successfully',
    },
    summary: 'Изменение данных организации',
  })
  async patchById(@Param('_id') id: string, @Body() updateDto: OrganizationAdminUpdateDto): Promise<IOrganization> {
    return this.service.updateOneOrException({ _id: id }, updateDto);
  }

  @Delete(':_id')
  @ManagerMethod({ response: { status: HttpStatus.NO_CONTENT } })
  async removeOne(@Param('_id') id: string): Promise<void> {
    await this.service.deleteOneOrException({ _id: id });
  }
}
