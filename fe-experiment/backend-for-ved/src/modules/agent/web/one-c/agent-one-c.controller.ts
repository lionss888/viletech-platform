import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IAgentService } from '../../service/agent.service.interface';
import { OneCMethod } from '../../../../lib/decorators/one-c-method.decorator';
import { AgentDto } from '../../../../lib/dto/models/agent.dto';
import { AgentOneCDto, AgentOneCPaginateDto } from '../../dto/agent.query.dto';
import { paginateHasNextPlainToClass, queryPaginateParser } from '../../../../lib/utils/helpers/entity.helper';

@ApiCookieAuth()
@ApiTags('one c agent')
@Controller('1c/agent')
export class AgentOneCController {
  constructor(@Inject('IAgentService') private readonly service: IAgentService) {}

  @Get()
  @OneCMethod({ hasNextPaginate: AgentDto })
  async findWithPaginate(@Query() dto: AgentOneCPaginateDto) {
    const { model, paginate } = queryPaginateParser(dto, AgentOneCDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(AgentDto, result);
  }
}
