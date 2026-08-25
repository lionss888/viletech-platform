import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { BaseService } from 'lib/services/base/base.service';
import { OrganizationStatusesHistorySchema } from './organization-statuses-history.schema';
import { IOrganizationStatusesHistory } from 'lib/interfaces/models/organization-statuses-history.interface';
import {
  IOrganizationStatusesHistoryService,
  IOrganizationStatusesHistoryQuery,
  IOrganizationStatusesHistoryCreate,
} from './organization-statuses-history.service.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';

@Injectable()
export class OrganizationStatusesHistoryService
  extends BaseService<
    IOrganizationStatusesHistory,
    OrganizationStatusesHistorySchema,
    IOrganizationStatusesHistoryQuery,
    IBaseOptions,
    IOrganizationStatusesHistoryCreate,
    never
  >
  implements IOrganizationStatusesHistoryService
{
  constructor(
    @InjectModel(OrganizationStatusesHistorySchema.name)
    readonly model: PaginateModel<OrganizationStatusesHistorySchema>,
  ) {
    super();
  }
}
