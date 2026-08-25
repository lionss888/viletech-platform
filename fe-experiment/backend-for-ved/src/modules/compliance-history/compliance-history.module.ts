import { Module } from '@nestjs/common';
import { ComplianceHistoryICOModule } from './web/internal-compliance-officer/compliance-history-ico.module';
import { ComplianceHistoryCOModule } from './web/compliance-officer/compliance-history-co.module';

@Module({
  imports: [ComplianceHistoryICOModule, ComplianceHistoryCOModule],
})
export class ComplianceHistoryModule {}
