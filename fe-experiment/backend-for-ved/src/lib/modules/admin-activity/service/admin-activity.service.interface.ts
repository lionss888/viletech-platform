import { IBaseService } from 'lib/services/base/base.service.interface';
import { IIdFieldQuery } from 'lib/interfaces/id-field.query.interface';
import { IIdsFieldQuery } from 'lib/interfaces/ids-field.query.interface';
import { IAdminActivity, IAdminActivityBase } from 'lib/interfaces/models/admin-activity.interface';

export interface IAdminActivityService extends IBaseService<IAdminActivity, IAdminActivityQuery> {}

export interface IAdminActivityQuery extends Partial<IAdminActivityBase>, IIdsFieldQuery, IIdFieldQuery {
  email?: string;
}
