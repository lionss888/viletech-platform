import { Module } from '@nestjs/common';
import { OrganizationInternalComplianceOfficerController } from './organization-internal-compliance-officer.controller';
import { OrganizationServiceModule } from '../../service/organization.service.module';

@Module({
  controllers: [OrganizationInternalComplianceOfficerController],
  imports: [OrganizationServiceModule],
})
export class OrganizationInternalComplianceOfficerModule {}
