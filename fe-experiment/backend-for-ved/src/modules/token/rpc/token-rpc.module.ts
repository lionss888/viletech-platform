import { Module } from '@nestjs/common';
import { TokenServiceModule } from '../service/token.service.module';
import { TokenRPCController } from './token-rpc.controller';

@Module({
  imports: [TokenServiceModule],
  controllers: [TokenRPCController],
})
export class TokenRPCModule {}
