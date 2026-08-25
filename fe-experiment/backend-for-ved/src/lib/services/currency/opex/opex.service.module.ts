import { Module } from '@nestjs/common';
import { OpexService } from './opex.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [{ provide: 'IOpexService', useClass: OpexService }],
  exports: [{ provide: 'IOpexService', useClass: OpexService }],
})
export class OpexSModule {}
