import { Module } from '@nestjs/common';
import { AdminActivityServiceModule } from '../service/admin-activity.service.module';
import { AdminActivityAdminController } from './admin-activity-admin.controller';

@Module({
  imports: [AdminActivityServiceModule],
  controllers: [AdminActivityAdminController],
})
export class AdminActivityAdminModule {}
