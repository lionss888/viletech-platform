import { Module } from '@nestjs/common';
import { FileProviderController } from './file-provider.controller';
import { FileServiceModule } from '../../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileProviderController],
})
export class FileProviderModule {}
