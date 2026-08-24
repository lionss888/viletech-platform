import { Module } from '@nestjs/common';
import { FileEventController } from './file-event.controller';
import { FileServiceModule } from '../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileEventController],
})
export class FileEventModule {}
