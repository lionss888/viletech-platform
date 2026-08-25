import { Module } from '@nestjs/common';
import { AgentRpcModule } from './rpc/agent-rpc.module';
import { AgentAdminModule } from './web/admin/agent-admin.module';
import { AgentOneCModule } from './web/one-c/agent-one-c.module';
import { AgentTreasurerModule } from './web/treasurer/agent-treasurer.module';

@Module({
  imports: [AgentAdminModule, AgentRpcModule, AgentOneCModule, AgentTreasurerModule],
})
export class AgentModule {}
