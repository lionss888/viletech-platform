import { Module } from '@nestjs/common';
import { AgentRpcController } from './agent-rpc.controller';
import { AgentServiceModule } from '../service/agent.service.module';

@Module({
  imports: [AgentServiceModule],
  controllers: [AgentRpcController],
})
export class AgentRpcModule {}
