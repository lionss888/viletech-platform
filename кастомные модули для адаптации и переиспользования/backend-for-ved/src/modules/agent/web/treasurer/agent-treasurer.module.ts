import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AgentServiceModule } from '../../service/agent.service.module';
import { AgentTreasurerController } from './agent-treasurer.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), AgentServiceModule],
  controllers: [AgentTreasurerController],
})
export class AgentTreasurerModule {}

