import { Module } from '@nestjs/common';
import { TreasurerTaskTreasurerController } from './treasurer-task-treasurer.controller';
import { TreasurerTaskServiceModule } from '../../service/treasurer-task.service.module';
import { FileServiceModule } from '../../../file/service/file.service.module';

@Module({
  imports: [TreasurerTaskServiceModule, FileServiceModule],
  controllers: [TreasurerTaskTreasurerController],
})
export class TreasurerTaskTreasurerModule {}

