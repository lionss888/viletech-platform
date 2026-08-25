import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentService } from './agent.service';
import { Agent, AgentSchema } from './agent.schema';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { AGENT_CLIENT } from '../agent.constants';
import { S3ServiceModule } from '../../../lib/modules/s3/s3.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
    NatsModule(AGENT_CLIENT),
    S3ServiceModule,
  ],
  providers: [{ provide: 'IAgentService', useClass: AgentService }],
  exports: [{ provide: 'IAgentService', useClass: AgentService }],
})
export class AgentServiceModule {}
