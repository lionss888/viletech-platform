import { Module } from '@nestjs/common';
import { ComplianceHistoryCOController } from './compliance-history-co.controller';
import { ComplianceHistoryServiceModule } from '../../service/compliance-history.service.module';
import { FileServiceModule } from '../../../file/service/file.service.module';

@Module({
  imports: [ComplianceHistoryServiceModule, FileServiceModule],
  controllers: [ComplianceHistoryCOController],
})
export class ComplianceHistoryCOModule {}
