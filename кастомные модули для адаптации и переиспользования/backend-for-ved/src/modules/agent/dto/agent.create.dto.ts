import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { AgentBaseDto } from 'lib/dto/models/agent.dto';
import { IAgentCreateMany } from '../service/agent.service.interface';

export class AgentCreateMany implements IAgentCreateMany {
  @Type(() => AgentBaseDto)
  @ValidateNested({ each: true })
  agents: AgentBaseDto[];
}
