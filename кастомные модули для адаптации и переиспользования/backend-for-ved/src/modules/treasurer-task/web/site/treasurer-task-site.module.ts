import { Module } from '@nestjs/common';
import { TreasurerTaskSiteController } from './treasurer-task-site.controller';
import { TreasurerTaskServiceModule } from '../../service/treasurer-task.service.module';
import { FileServiceModule } from '../../../file/service/file.service.module';

@Module({
    imports: [TreasurerTaskServiceModule, FileServiceModule],
    controllers: [TreasurerTaskSiteController],
})
export class TreasurerTaskSiteModule {}

