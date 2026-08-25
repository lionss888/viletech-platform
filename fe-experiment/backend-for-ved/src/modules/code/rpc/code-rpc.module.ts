import { Module } from '@nestjs/common';
import { CodeServiceModule } from '../service/code.service.module';
import { CodeRPCController } from './code-rpc.controller';

@Module({
  imports: [CodeServiceModule],
  controllers: [CodeRPCController],
})
export class CodeRPCModule {}
