import { Module } from '@nestjs/common';
import { TokenRPCModule } from './rpc/token-rpc.module';

@Module({
  imports: [TokenRPCModule],
})
export class TokenModule {}
