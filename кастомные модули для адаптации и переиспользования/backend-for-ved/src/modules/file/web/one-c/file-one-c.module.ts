import { Module } from '@nestjs/common';
import { FileOneCController } from './file-one-c.controller';
import { FileServiceModule } from '../../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileOneCController],
})
export class FileOneCModule {}
