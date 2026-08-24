import { Module } from '@nestjs/common';
import { FileRpcController } from './file-rpc.controller';
import { FileServiceModule } from '../service/file.service.module';

@Module({
  imports: [FileServiceModule],
  controllers: [FileRpcController],
})
export class FileRpcModule {}
