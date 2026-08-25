import { ISchema } from 'lib/interfaces/schema.interface';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationSubaccountStatusType,
  OrganizationStatus,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { IAccount } from './account.interface';
import { IFile } from './file.interface';
import { IRequisites } from '../bank-requisites.interface';

export interface IOrganizationSigner {
  signerName: string;
  signerPosition: OrganizationSignerPositionType;
  signerOtherPosition?: string;
}

export interface IOrganizationSubaccount {
  account: string | IAccount;
  name: string;
  status: OrganizationSubaccountStatusType;
  inviteDate?: Date;
}

export interface IOrganizationRequisites extends IRequisites {
  uuid?: string;
}

export interface IOrganizationBase extends IOrganizationSigner {
  name: string;
  inn?: string;
  ogrn?: string;
  kpp?: string;
  legalAddress?: string;
  fullName?: string;
  email: string;
  phone: string;
  account?: string | IAccount;
  type: OrganizationType;
  businessForm: OrganizationBusinessFormType;
  organizationCard?: string | IFile;
  subaccounts?: IOrganizationSubaccount[];
  status: OrganizationStatus;
  approvedAt?: Date;
  isDeleted?: boolean;
  isActive?: boolean;
  requisites?: IOrganizationRequisites[];
  requisite?: IOrganizationRequisites;
  hsCodePrefixes?: string[];
  hsCodes?: string[];
}

export interface IOrganizationRequisitesAdd extends Omit<IOrganizationRequisites, 'uuid'> {}

export interface IOrganization extends ISchema, IOrganizationBase {}
