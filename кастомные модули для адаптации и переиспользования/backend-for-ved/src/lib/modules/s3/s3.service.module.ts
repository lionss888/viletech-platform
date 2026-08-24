import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ShutdownServiceModule } from 'lib/modules/shutdown/shutdown.service.module';

@Module({
  imports: [ShutdownServiceModule],
  providers: [{ provide: 'IS3Service', useClass: S3Service }],
  exports: [{ provide: 'IS3Service', useClass: S3Service }],
})
export class S3ServiceModule {}
