import { Module } from '@nestjs/common';
import { CbrService } from './cbr.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [{ provide: 'ICbrService', useClass: CbrService }],
  exports: [{ provide: 'ICbrService', useClass: CbrService }],
})
export class CbrModule {}
