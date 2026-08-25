import { Module } from '@nestjs/common';
import { FileSiteController } from './file-site.controller';
import { FileServiceModule } from '../../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileSiteController],
})
export class FileSiteModule {}
