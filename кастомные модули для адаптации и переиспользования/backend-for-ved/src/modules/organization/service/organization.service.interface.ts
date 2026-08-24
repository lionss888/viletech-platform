import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from 'lib/services/base/base.service.interface';
import {
  IOrganization,
  IOrganizationBase,
  IOrganizationSubaccount,
  IOrganizationRequisitesAdd,
} from 'lib/interfaces/models/organization.interface';
import { FeatureContext } from 'lib/classes/feature-context.class';

export interface IOrganizationService
  extends IBaseService<
    IOrganization,
    IOrganizationAdminQuery,
    IBaseOptions,
    IOrganizationAdminCreate,
    IOrganizationUpdate
  > {
  createByUser(data: IOrganizationSiteCreate): Promise<IOrganization>;
  deleteByUser(dto: IOrganizationSiteDelete): Promise<void>;
  updateByUser(findData: IOrganizationSiteQuery, updateData: IOrganizationSiteUpdate): Promise<IOrganization>;
  updateByInternalCompliance(
    ctx: FeatureContext,
    findData: IOrganizationSiteQuery,
    updateData: IOrganizationInternalComplianceOfficerUpdate,
  ): Promise<IOrganization>;
  createProviderOrganization(data: IOrganizationProviderCreate): Promise<IOrganization>;
  removeHsCode(code: string, prefix?: string): Promise<void>;
  /**
   * Получает список ID организаций, к которым у пользователя есть доступ:
   * - где пользователь является активным сабаккаунтом
   * - где пользователь является владельцем (account)
   * @param accountId ID аккаунта пользователя
   * @returns Массив ID организаций
   */
  getAccessibleOrganizationIds(accountId: string): Promise<string[]>;
  /**
   * Проверяет, имеет ли пользователь доступ к организации
   * (является сабаккаунтом или владельцем)
   * @param organizationId ID организации
   * @param accountId ID аккаунта пользователя
   * @returns true, если пользователь имеет доступ
   */
  hasOrganizationAccess(organizationId: string, accountId: string): Promise<boolean>;
}

export interface IOrganizationSiteQuery extends IBaseQuery, Partial<IOrganizationBase> {
  subaccount?: string;
  invitedSubaccount?: string;
  isActive?: boolean;
}
export interface IOrganizationAdminQuery extends IOrganizationSiteQuery {
  exactInn?: string;
}

export interface IOrganizationQuery extends IOrganizationSiteQuery, IOrganizationAdminQuery {}

export interface IOrganizationSiteCreate extends Omit<IOrganizationBase, 'type' | 'status' | 'isDeleted'> {
  account: string;
  organizationCard?: string;
}

export interface IOrganizationAdminCreate extends Omit<IOrganizationBase, 'account' | 'status' | 'isDeleted'> {
  organizationCard?: string;
}
export interface IOrganizationCreate extends Partial<IOrganizationSiteCreate>, Partial<IOrganizationAdminCreate> {}

export interface IOrganizationSiteUpdate extends UpdatePartial<Omit<IOrganization, 'account'>> {
  addRequisites?: IOrganizationRequisitesAdd[];
  removeRequisites?: string[];
  addHsCodes?: string[];
  removeHsCodes?: string[];
  addHsCodePrefixes?: string[];
  removeHsCodePrefixes?: string[];
}
export interface IOrganizationAdminUpdate extends UpdatePartial<IOrganization> {}
export interface IOrganizationUpdate extends IOrganizationAdminUpdate {
  addSubaccount?: IOrganizationSubaccount;
  removeSubaccount?: string;
  delegateToSubaccount?: string;
}

export interface IOrganizationUpdate extends IOrganizationAdminUpdate, IOrganizationSiteUpdate {}

export interface IOrganizationSiteDelete extends Pick<IOrganization, '_id'> {
  account: string;
}

export interface IOrganizationAdminDelete extends Pick<IOrganization, '_id'> {}

export interface IOrganizationInternalComplianceOfficerUpdate extends Pick<IOrganization, 'status'> {}

export interface IOrganizationProviderCreate
  extends Omit<IOrganizationBase, 'type' | 'status' | 'isDeleted' | 'subaccounts' | 'account' | 'organizationCard'> {
  isActive?: boolean;
  organizationCard?: string;
}
