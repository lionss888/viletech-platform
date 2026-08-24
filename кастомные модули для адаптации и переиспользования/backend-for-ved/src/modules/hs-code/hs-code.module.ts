import { Module } from '@nestjs/common';
import { HsCodeSiteModule } from './web/site/hs-code-site.module';
import { HsCodeComplianceOfficerModule } from './web/compliance-officer/hs-code-compliance-officer.module';
import { HsCodeRootModule } from './web/root/hs-code-root.module';

@Module({
  imports: [HsCodeSiteModule, HsCodeComplianceOfficerModule, HsCodeRootModule],
})
export class HsCodeModule {}
