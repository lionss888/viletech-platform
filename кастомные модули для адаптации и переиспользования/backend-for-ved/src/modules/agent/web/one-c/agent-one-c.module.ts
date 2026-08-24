import { Module } from '@nestjs/common';
import { AgentServiceModule } from '../../service/agent.service.module';
import { AgentOneCController } from './agent-one-c.controller';

@Module({
  controllers: [AgentOneCController],
  imports: [AgentServiceModule],
})
export class AgentOneCModule {}
