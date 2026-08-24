import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { AdminActivity, AdminActivitySchema } from './admin-activity.schema';
import { ADMIN_ACTIVITY_CLIENT } from '../admin-activity.constants';
import { AdminActivityService } from './admin-activity.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AdminActivity.name, schema: AdminActivitySchema }]),
    NatsModule(ADMIN_ACTIVITY_CLIENT),
  ],
  providers: [{ provide: 'IAdminActivityService', useClass: AdminActivityService }],
  exports: [{ provide: 'IAdminActivityService', useClass: AdminActivityService }],
})
export class AdminActivityServiceModule {}
