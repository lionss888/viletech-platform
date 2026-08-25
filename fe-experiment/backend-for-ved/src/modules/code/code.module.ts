import { Module } from '@nestjs/common';
import { CodeRPCModule } from './rpc/code-rpc.module';

@Module({
  imports: [CodeRPCModule],
})
export class CodeModule {}
