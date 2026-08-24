import { Module } from '@nestjs/common';
import { NODUL_SERVICE } from './nodul.service.interface';
import { NodulService } from './nodul.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [{ provide: NODUL_SERVICE, useClass: NodulService }],
  exports: [{ provide: NODUL_SERVICE, useClass: NodulService }],
})
export class NodulModule {}
