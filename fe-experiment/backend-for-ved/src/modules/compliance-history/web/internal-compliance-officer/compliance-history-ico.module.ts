import { Module } from '@nestjs/common';
import { ComplianceHistoryICOController } from './compliance-history-ico.controller';
import { ComplianceHistoryServiceModule } from '../../service/compliance-history.service.module';
import { FileServiceModule } from '../../../file/service/file.service.module';

@Module({
  imports: [ComplianceHistoryServiceModule, FileServiceModule],
  controllers: [ComplianceHistoryICOController],
})
export class ComplianceHistoryICOModule {}
