import { IBaseOptions, IBaseQuery, IBaseService } from 'lib/services/base/base.service.interface';
import { IOrganizationStatusesHistory } from 'lib/interfaces/models/organization-statuses-history.interface';
import { OrganizationStatus } from 'lib/enums/models/organization.enums';
import { AccountRole } from 'lib/enums/models/account.enums';

export interface IOrganizationStatusesHistoryService
  extends IBaseService<
    IOrganizationStatusesHistory,
    IOrganizationStatusesHistoryQuery,
    IBaseOptions,
    IOrganizationStatusesHistoryCreate,
    never
  > {}

export interface IOrganizationStatusesHistoryQuery extends IBaseQuery {
  organizationId?: string;
  status?: OrganizationStatus;
}

export interface IOrganizationStatusesHistoryCreate {
  organizationId: string;
  status: OrganizationStatus;
  accountId?: string;
  accountRoles: AccountRole[];
}
