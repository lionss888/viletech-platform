import { Module } from '@nestjs/common';
import { AgentAdminController } from './agent-admin.controller';
import { AgentServiceModule } from '../../service/agent.service.module';

@Module({
  imports: [AgentServiceModule],
  controllers: [AgentAdminController],
})
export class AgentAdminModule {}
