import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Inject, Param, Put, Query } from '@nestjs/common';
import { IOrganizationService } from '../../service/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../../organization.constants';
import { InternalComplianceOfficerMethod } from '../../../../lib/decorators/internal-compliance-officer-method.decorator';
import { OrganizationAdminPaginateDto, OrganizationAdminQueryDto } from '../../dto/organization.query.dto';
import {
  paginateHasNextPlainToClass,
  plainModelToClass,
  queryPaginateParser,
} from '../../../../lib/utils/helpers/entity.helper';
import { OrganizationDto, OrganizationFullDto } from '../../../../lib/dto/models/organization.dto';
import { IPaginateHasNextResult } from '../../../../lib/interfaces/paginate.interface';
import { IOrganization } from '../../../../lib/interfaces/models/organization.interface';
import { IdFieldDto } from '../../../../lib/dto/id-field.dto';
import { CountFieldDto } from '../../../../lib/dto/count-field.dto';
import { ICountField } from '../../../../lib/interfaces/count-field.interface';
import { OrganizationStatus } from '../../../../lib/enums/models/organization.enums';
import { ReqContext } from '../../../../lib/decorators/req-context.decorator';
import { FeatureContext } from '../../../../lib/classes/feature-context.class';

@ApiCookieAuth()
@ApiTags('organization')
@Controller('admin/internal-compliance-officer/organization')
export class OrganizationInternalComplianceOfficerController {
  constructor(@Inject(ORGANIZATION_SERVICE) private readonly service: IOrganizationService) {}

  @Get()
  @InternalComplianceOfficerMethod({ summary: 'Получение организаций с пагинацией', hasNextPaginate: OrganizationDto })
  async findWithPaginate(@Query() dto: OrganizationAdminPaginateDto): Promise<IPaginateHasNextResult<IOrganization>> {
    const { paginate, model } = queryPaginateParser(dto, OrganizationAdminQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(OrganizationDto, result);
  }

  @Get('count')
  @InternalComplianceOfficerMethod({
    summary: 'Получение количества организаций',
    response: { status: 200, type: CountFieldDto },
  })
  async count(@Query() dto: OrganizationAdminQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':_id')
  @InternalComplianceOfficerMethod({
    summary: 'Получение организации по _id',
    response: { status: 200, type: OrganizationFullDto },
  })
  async getOrganization(@Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.findOneOrException(dto, { include: ['organizationCard'] });
    return plainModelToClass(OrganizationFullDto, model);
  }

  @Put(':_id/approve')
  @InternalComplianceOfficerMethod({ summary: 'Подтверждение организации', response: { status: 200 } })
  async approve(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IOrganization> {
    return await this.service.updateByInternalCompliance(ctx, dto, { status: OrganizationStatus.APPROVED });
  }

  @Put(':_id/un-approve')
  @InternalComplianceOfficerMethod({ summary: 'Сделать организацию неподтверждённой', response: { status: 200 } })
  async unApprove(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.updateByInternalCompliance(ctx, dto, { status: OrganizationStatus.NOT_APPROVED });
    return plainModelToClass(OrganizationFullDto, model);
  }

  @Put(':_id/block')
  @InternalComplianceOfficerMethod({ summary: 'Заблокировать организацию', response: { status: 200 } })
  async block(@ReqContext() ctx: FeatureContext, @Param() dto: IdFieldDto): Promise<IOrganization> {
    const model = await this.service.updateByInternalCompliance(ctx, dto, { status: OrganizationStatus.BLOCKED });
    return plainModelToClass(OrganizationFullDto, model);
  }
}
