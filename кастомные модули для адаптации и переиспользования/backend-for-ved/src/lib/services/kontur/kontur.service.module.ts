import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KonturService } from './kontur.service';
import { KONTUR_SERVICE } from './kontur.service.interface';

@Module({
  imports: [HttpModule],
  providers: [{ provide: KONTUR_SERVICE, useClass: KonturService }],
  exports: [{ provide: KONTUR_SERVICE, useClass: KonturService }],
})
export class KonturServiceModule {}
