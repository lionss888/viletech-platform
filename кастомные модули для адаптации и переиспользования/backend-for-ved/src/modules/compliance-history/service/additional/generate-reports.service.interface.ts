import { StreamableFile } from '@nestjs/common';
import { ClientOrganizationQueryDto } from '../../dto/client-organization.query.dto';
import { ClientOrganizationRequestsPaginateDto } from '../../dto/client-organization-requests.query.dto';
import { AccountRole } from 'lib/enums/models/account.enums';

export interface IGenerateReportsService {
  generateInternalComplianceReport(filters: ClientOrganizationQueryDto): Promise<StreamableFile>;

  generateExternalComplianceReport(filters: ClientOrganizationQueryDto): Promise<StreamableFile>;

  generateClientRequestsReport(
    organizationId: string,
    role: AccountRole,
    filters: ClientOrganizationRequestsPaginateDto,
  ): Promise<StreamableFile>;
}
