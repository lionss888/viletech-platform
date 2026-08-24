import { Module } from '@nestjs/common';
import { AdminActivityAdminModule } from './web/admin-activity-admin.module';

@Module({ imports: [AdminActivityAdminModule] })
export class AdminActivityModule {}
