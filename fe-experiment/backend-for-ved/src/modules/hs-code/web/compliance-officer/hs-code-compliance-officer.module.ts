import { Module } from '@nestjs/common';
import { HsCodeComplianceOfficerController } from './hs-code-compliance-officer.controller';
import { HsCodeServiceModule } from '../../service/hs-code.service.module';

@Module({
  imports: [HsCodeServiceModule],
  controllers: [HsCodeComplianceOfficerController],
})
export class HsCodeComplianceOfficerModule {}
