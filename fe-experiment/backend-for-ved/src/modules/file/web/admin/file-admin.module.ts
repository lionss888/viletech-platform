import { Module } from '@nestjs/common';
import { FileAdminController } from './file-admin.controller';
import { FileServiceModule } from '../../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileAdminController],
})
export class FileAdminModule {}
