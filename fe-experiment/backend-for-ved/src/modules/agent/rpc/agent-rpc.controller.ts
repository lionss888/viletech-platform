import { Controller, Inject } from '@nestjs/common';
import { IAgentService } from '../service/agent.service.interface';
import { AgentCreateMany } from '../dto/agent.create.dto';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { AgentPattern } from 'lib/enums/models/agent.enums';
import { AgentRPCQueryDto } from '../dto/agent.query.dto';
import { IAgent } from 'lib/interfaces/models/agent.interface';

@Controller()
export class AgentRpcController {
  constructor(@Inject('IAgentService') private readonly service: IAgentService) {}

  @CatcherMessagePattern(AgentPattern.CREATE_MANY)
  async createManyFull(data: AgentCreateMany): Promise<void> {
    await this.service.createMany(data);
  }

  @CatcherMessagePattern(AgentPattern.FIND_ONE_OR_EXCEPTION)
  async findOneOrException({ query, options }: AgentRPCQueryDto): Promise<IAgent> {
    return this.service.findOneOrException(query, options);
  }
}
