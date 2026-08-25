import { AccountRole } from 'lib/enums/models/account.enums';
import { ClientOrganizationPaginateDto } from '../dto/client-organization.query.dto';
import { ClientOrganizationListDto } from '../dto/client-organization-list.dto';
import { ClientOrganizationDto } from '../dto/client-organization.dto';
import { ClientOrganizationRequestsPaginateDto } from '../dto/client-organization-requests.query.dto';
import { ClientOrganizationRequestsDto } from '../dto/client-organization-requests.dto';

export interface IComplianceHistoryService {
  getClientsList(role: AccountRole, filters: ClientOrganizationPaginateDto): Promise<ClientOrganizationListDto>;

  getClientDetails(organizationId: string): Promise<ClientOrganizationDto>;

  getClientRequests(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<ClientOrganizationRequestsDto>;

  getClientRequestsForExport(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<unknown[]>;
}
