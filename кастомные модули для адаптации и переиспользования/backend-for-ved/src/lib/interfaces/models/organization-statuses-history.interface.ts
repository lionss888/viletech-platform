import { ISchema } from '../schema.interface';
import { OrganizationStatus } from 'lib/enums/models/organization.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IOrganization } from './organization.interface';
import { IAccount } from './account.interface';

export interface IOrganizationStatusesHistory extends ISchema {
  organizationId: string | IOrganization;
  status: OrganizationStatus;
  accountId?: string | IAccount;
  accountRoles: AccountRole[];
}
