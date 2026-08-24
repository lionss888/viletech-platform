import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { RootMethod } from 'lib/decorators/root-method.decorator';
import { AgentBaseDto, AgentDto } from '../../../../lib/dto/models/agent.dto';
import { IAgent } from '../../../../lib/interfaces/models/agent.interface';
import { AgentAdminPaginateDto, AgentQueryDto } from '../../dto/agent.query.dto';
import { IAgentOptions, IAgentService } from '../../service/agent.service.interface';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';
import { AgentUpdateByAdminDto } from 'modules/agent/dto/agent.update.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AgentFilesDto } from '../../dto/agent-files.dto';

@ApiCookieAuth()
@ApiTags('admin agent')
@Controller('admin/agent')
export class AgentAdminController {
  constructor(@Inject('IAgentService') private readonly service: IAgentService) {}

  @Get()
  @ManagerMethod({ hasNextPaginate: AgentDto })
  async findWithPaginate(@Query() dto: AgentAdminPaginateDto): Promise<IPaginateHasNextResult<IAgent>> {
    const { paginate, model } = queryPaginateParser(dto, AgentQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(AgentDto, result);
  }

  @Post()
  @RootMethod({ response: { status: 200, type: AgentDto } })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'stamp', maxCount: 1 },
      { name: 'signature', maxCount: 1 },
    ]),
  )
  async createAdmin(
    @Body() dto: AgentBaseDto,
    @UploadedFiles()
    files?: {
      stamp?: Express.Multer.File[];
      signature?: Express.Multer.File[];
    },
  ): Promise<IAgent> {
    const options: IAgentOptions = {
      files: {
        stamp: files?.stamp?.[0],
        signature: files?.signature?.[0],
      },
    };

    const account = await this.service.create(dto, options);
    return plainModelToClass(AgentDto, account);
  }

  @Get('count')
  @ManagerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: AgentQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':_id')
  @ManagerMethod({ response: { status: 200, type: AgentDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IAgent> {
    const model = await this.service.findOneOrException(dto);
    return plainModelToClass(AgentDto, model);
  }

  @Patch(':_id')
  @RootMethod({
    response: {
      status: HttpStatus.OK,
      type: AgentUpdateByAdminDto,
    },
  })
  @ApiOperation({ summary: 'Update agent data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent data updated successfully',
    type: AgentUpdateByAdminDto,
  })
  async patchById(@Param('_id') id: string, @Body() updateDto: AgentUpdateByAdminDto): Promise<IAgent> {
    return this.service.updateByAdmin({ _id: id }, updateDto);
  }

  @Patch(':_id/files')
  @RootMethod({
    response: {
      status: HttpStatus.OK,
      type: AgentFilesDto,
    },
  })
  @ApiOperation({ summary: 'Update agent files ids (stamp and signature)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files updated successfully',
  })
  async updateFiles(@Param('_id') _id: string, @Body() dto: AgentFilesDto): Promise<IAgent> {
    return this.service.updateFilesOnly({ _id }, dto);
  }
}
