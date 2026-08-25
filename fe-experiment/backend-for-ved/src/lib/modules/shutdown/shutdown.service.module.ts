import { Module } from '@nestjs/common';
import { ShutdownService } from './shutdown.service';

@Module({
  providers: [{ provide: 'IShutdownService', useClass: ShutdownService }],
  exports: [{ provide: 'IShutdownService', useClass: ShutdownService }],
})
export class ShutdownServiceModule {}
