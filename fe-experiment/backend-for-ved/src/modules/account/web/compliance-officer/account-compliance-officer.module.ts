import { Module } from '@nestjs/common';
import { AccountComplianceOfficerController } from './account-compliance-officer.controller';
import { AccountServiceModule } from '../../service/account.service.module';

@Module({
  imports: [AccountServiceModule],
  controllers: [AccountComplianceOfficerController],
})
export class AccountComplianceOfficerModule {}
