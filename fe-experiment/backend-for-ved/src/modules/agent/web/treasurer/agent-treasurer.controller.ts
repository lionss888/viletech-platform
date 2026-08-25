import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { plainModelToClass } from 'lib/utils/helpers/entity.helper';
import { TreasurerMethod } from '../../../../lib/decorators/treasurer-method.decorator';
import { AgentDto } from '../../../../lib/dto/models/agent.dto';
import { IAgent } from '../../../../lib/interfaces/models/agent.interface';
import { IAgentService } from '../../service/agent.service.interface';

@ApiCookieAuth()
@ApiTags('treasurer agent')
@Controller('treasurer/agent')
export class AgentTreasurerController {
  constructor(@Inject('IAgentService') private readonly service: IAgentService) {}

  @Get(':_id')
  @TreasurerMethod({ response: { status: 200, type: AgentDto } })
  async getAgent(@Param() dto: IdFieldDto): Promise<IAgent> {
    const model = await this.service.findOneOrException(dto);
    return plainModelToClass(AgentDto, model);
  }
}

