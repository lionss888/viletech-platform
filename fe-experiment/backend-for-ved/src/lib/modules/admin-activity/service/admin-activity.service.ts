import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { AdminActivity } from './admin-activity.schema';
import { FilterQuery, PaginateModel, PopulateOptions } from 'mongoose';
import { BaseService } from 'lib/services/base/base.service';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { removeFieldInclude } from 'lib/utils/helpers/populate-options.helper';
import { IAdminActivity } from 'lib/interfaces/models/admin-activity.interface';
import { IAdminActivityQuery, IAdminActivityService } from './admin-activity.service.interface';
import { InjectNats, NatsClientProxy } from '../../nats/nats-client-proxy';

@Injectable()
export class AdminActivityService
  extends BaseService<IAdminActivity, AdminActivity, IAdminActivityQuery>
  implements IAdminActivityService
{
  constructor(
    @InjectModel(AdminActivity.name) readonly model: PaginateModel<AdminActivity>,
    @InjectNats() readonly client: NatsClientProxy,
  ) {
    super();
  }

  protected async makeQuery(findData: IAdminActivityQuery): Promise<any> {
    const query: FilterQuery<AdminActivity> = {};

    if (findData._id) {
      query._id = findData._id;
    }

    if (findData._ids) {
      query._id = { $in: findData._ids };
    }

    if (findData.email) {
      const account = await this.client.send(AccountPattern.FIND_ONE, { query: { email: findData.email } });
      query.account = account;
    }

    if (findData.path) {
      query.path = new RegExp(findData.path, 'g');
    }

    if (findData.method) {
      query.method = findData.method;
    }

    if (findData.account) {
      query.account = findData.account;
    }

    return query;
  }

  protected makePopulate(options?: IBaseOptions): PopulateOptions | (PopulateOptions | string)[] {
    const populates = [];

    if (options && options.include && removeFieldInclude(options, 'account')) {
      populates.push({ path: 'account', select: '_id email fullName avatar rank' });
    }

    return populates;
  }
}
