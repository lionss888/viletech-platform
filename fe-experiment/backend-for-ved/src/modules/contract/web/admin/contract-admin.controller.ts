import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, plainModelToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { CountFieldDto } from 'lib/dto/count-field.dto';
import { ICountField } from 'lib/interfaces/count-field.interface';
import { ContractDto, ContractFullDto } from '../../../../lib/dto/models/contract.dto';
import { IContract } from '../../../../lib/interfaces/models/contract.interface';
import { ContractAdminPaginateDto, ContractQueryDto } from '../../dto/contract.query.dto';
import { IContractService } from '../../service/contract.service.interface';
import { ContractAdminCreateDto, ContractCreateTemplateDto } from '../../dto/contract.create.dto';
import { ContractStatus } from '../../../../lib/enums/models/contract.enums';
import { TextFieldDto } from '../../../../lib/dto/text-field.dto';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';
import { ContractAcceptDto, ContractAdminUpdateDto } from '../../dto/contract.update.dto';
import { Request } from 'express';

@ApiCookieAuth()
@ApiTags('admin, manager contract')
@Controller('admin/contract')
export class ContractAdminController {
  constructor(@Inject('IContractService') private readonly service: IContractService) {}

  @Get()
  @ManagerMethod({ hasNextPaginate: ContractDto })
  async findWithPaginate(@Query() dto: ContractAdminPaginateDto): Promise<IPaginateHasNextResult<IContract>> {
    const { paginate, model } = queryPaginateParser(dto, ContractQueryDto);
    const result = await this.service.find(model, paginate);
    return paginateHasNextPlainToClass(ContractDto, result);
  }

  @Get('full')
  @ManagerMethod({ hasNextPaginate: ContractDto })
  async findFullWithPaginate(@Query() dto: ContractAdminPaginateDto): Promise<IPaginateHasNextResult<IContract>> {
    const { paginate, model } = queryPaginateParser(dto, ContractQueryDto);
    const result = await this.service.find(model, { ...paginate, include: ['file', 'agent'] });
    return paginateHasNextPlainToClass(ContractFullDto, result);
  }

  @Post('template')
  @ManagerMethod({ response: { status: 201, type: ContractDto } })
  async createTemplate(@Body() dto: ContractCreateTemplateDto): Promise<IContract> {
    const model = await this.service.create({ ...dto, isTemplate: true });
    return plainModelToClass(ContractDto, model);
  }

  @Post('')
  @ManagerMethod({ response: { status: 201, type: ContractDto } })
  async createManager(@Req() req: Request, @Body() dto: ContractAdminCreateDto): Promise<IContract> {
    const model = await this.service.createManager({ ...dto, adminAccount: req.account._id });
    return plainModelToClass(ContractDto, model);
  }

  @Get('count')
  @ManagerMethod({ response: { status: 200, type: CountFieldDto } })
  async count(@Query() dto: ContractQueryDto): Promise<ICountField> {
    const result = await this.service.count(dto);
    return plainModelToClass(CountFieldDto, result);
  }

  @Get(':_id')
  @ManagerMethod({ response: { status: 200, type: ContractDto } })
  async getAccount(@Param() dto: IdFieldDto): Promise<IContract> {
    const model = await this.service.findOneOrException(dto);
    return plainModelToClass(ContractDto, model);
  }

  @Patch(':_id')
  @ManagerMethod({ response: { status: 200, type: ContractDto } })
  patchById(@Param() dto: IdFieldDto, @Body() updateDto: ContractAdminUpdateDto): Promise<IContract> {
    return this.service.updateOne(dto, updateDto);
  }

  @Put(':_id/accept')
  @ManagerMethod({ response: { status: 200, type: ContractDto } })
  accept(@Param() dto: IdFieldDto, @Body() updateDto: ContractAcceptDto): Promise<IContract> {
    return this.service.updateOneAdmin(dto, { status: ContractStatus.ACCEPTED, ...updateDto });
  }

  @Put(':_id/reject')
  @ManagerMethod({ response: { status: 200, type: ContractDto } })
  reject(@Param() dto: IdFieldDto, @Body() { text }: TextFieldDto): Promise<IContract> {
    return this.service.updateOneAdmin(dto, { status: ContractStatus.REJECTED, rejectText: text });
  }
}
