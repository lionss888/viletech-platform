import { Module } from '@nestjs/common';
import { TreasurerTaskServiceModule } from './service/treasurer-task.service.module';
import { TreasurerTaskTreasurerModule } from './web/treasurer/treasurer-task-treasurer.module';
import { TreasurerTaskSiteModule } from './web/site/treasurer-task-site.module';

@Module({
  imports: [TreasurerTaskServiceModule, TreasurerTaskTreasurerModule, TreasurerTaskSiteModule],
})
export class TreasurerTaskModule {}
