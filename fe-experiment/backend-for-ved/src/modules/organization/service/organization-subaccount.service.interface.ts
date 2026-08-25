import { IBaseOptions, IBaseService } from 'lib/services/base/base.service.interface';
import { IOrganization, IOrganizationSubaccount } from 'lib/interfaces/models/organization.interface';
import {
  IOrganizationAdminCreate,
  IOrganizationAdminQuery,
  IOrganizationSiteQuery,
  IOrganizationUpdate,
} from './organization.service.interface';

export interface IOrganizationSubaccountService
  extends IBaseService<
    IOrganization,
    IOrganizationAdminQuery,
    IBaseOptions,
    IOrganizationAdminCreate,
    IOrganizationUpdate
  > {
  inviteSubaccountByUser(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationSendSubaccountInvite,
  ): Promise<IOrganization>;
  deleteSubaccountByUser(
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationDeleteSubaccount,
  ): Promise<IOrganization>;
  replyInviteByUser(
    findData: IOrganizationSiteQuery,
    updateData: Pick<IOrganizationSubaccount, 'status'>,
  ): Promise<void>;

  delegateToSubaccount(findData: IOrganizationSiteQuery, updateData: IOrganizationUpdate): Promise<IOrganization>;
}

export interface IOrganizationSendSubaccountInvite extends Pick<IOrganizationSubaccount, 'name'> {
  email: string;
  redirectUrl: string;
}

export interface IOrganizationDeleteSubaccount extends Pick<IOrganizationSubaccount, 'account'> {}
