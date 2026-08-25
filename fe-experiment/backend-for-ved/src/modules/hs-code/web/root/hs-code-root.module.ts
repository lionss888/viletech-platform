import { Module } from '@nestjs/common';
import { HsCodeRootController } from './hs-code-root.controller';
import { HsCodeServiceModule } from '../../service/hs-code.service.module';

@Module({
  imports: [HsCodeServiceModule],
  controllers: [HsCodeRootController],
})
export class HsCodeRootModule {}
