import { Module } from '@nestjs/common';
import { CryptoAuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [{ provide: 'ICryptoAuthService', useClass: CryptoAuthService }],
  exports: [{ provide: 'ICryptoAuthService', useClass: CryptoAuthService }],
})
export class CryptoAuthServiceModule {}
