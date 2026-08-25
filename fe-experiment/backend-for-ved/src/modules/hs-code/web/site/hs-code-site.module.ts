import { Module } from '@nestjs/common';
import { HsCodeSiteController } from './hs-code-site.controller';
import { HsCodeServiceModule } from '../../service/hs-code.service.module';

@Module({
  imports: [HsCodeServiceModule],
  controllers: [HsCodeSiteController],
})
export class HsCodeSiteModule {}
