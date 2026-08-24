import { IdFieldDto } from 'lib/dto/id-field.dto';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { AdminActivityDto } from 'lib/dto/models/admin-activity.dto';
import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { IAdminActivity } from 'lib/interfaces/models/admin-activity.interface';
import { IAdminActivityService } from '../service/admin-activity.service.interface';
import { plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { AdminActivityPaginateDto, AdminActivityQueryDto } from '../dto/admin-activity.query.dto';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { RootMethod } from 'lib/decorators/root-method.decorator';

@ApiCookieAuth()
@ApiTags('admin admin-activity')
@Controller('admin/admin-activity')
export class AdminActivityAdminController {
  constructor(@Inject('IAdminActivityService') private readonly service: IAdminActivityService) {}

  @Get('count')
  @RootMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: AdminActivityQueryDto): Promise<CountFieldDto> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get()
  @RootMethod({ paginate: AdminActivityDto })
  find(@Query() dto: AdminActivityPaginateDto): Promise<IPaginateResult<IAdminActivity>> {
    const { paginate, model } = queryPaginateParser(dto, AdminActivityQueryDto);
    return this.service.find(model, { ...paginate, include: ['account'] });
  }

  @Get(':_id')
  @ApiNotFoundMessagesResponse(['AdminActivity not found.'])
  @RootMethod({ response: { status: 200, type: AdminActivityDto } })
  getById(@Param() dto: IdFieldDto): Promise<IAdminActivity> {
    return this.service.findOneOrException(dto, { include: ['account'] });
  }
}
