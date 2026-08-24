export interface IKonturService {
  fetchOrganizationByInn(inn: string): Promise<IKonturOrganizationData | null>;
}

export const KONTUR_SERVICE = 'IKonturService';

import { OrganizationBusinessFormType, OrganizationSignerPositionType } from 'lib/enums/models/organization.enums';

export interface IKonturOrganizationData {
  inn: string;
  ogrn?: string;
  kpp?: string;
  legalAddress?: string;
  fullName?: string;
  name?: string;
  businessForm?: OrganizationBusinessFormType;
  ceoName?: string;
  ceoPosition?: OrganizationSignerPositionType;
  isActive?: boolean;
  statusString?: string;
}
