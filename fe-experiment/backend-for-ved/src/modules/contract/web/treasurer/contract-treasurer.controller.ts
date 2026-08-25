import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { paginateHasNextPlainToClass, queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IPaginateHasNextResult } from 'lib/interfaces/paginate.interface';
import { ContractFullDto } from 'lib/dto/models/contract.dto';
import { IContract } from 'lib/interfaces/models/contract.interface';
import { ContractAdminPaginateDto, ContractQueryDto } from '../../dto/contract.query.dto';
import { IContractService } from '../../service/contract.service.interface';
import { TreasurerMethod } from '../../../../lib/decorators/treasurer-method.decorator';

@ApiCookieAuth()
@ApiTags('treasurer contract')
@Controller(['treasurer/contract', 'admin/treasurer/contract'])
export class ContractTreasurerController {
  constructor(@Inject('IContractService') private readonly service: IContractService) {}

  @Get('full')
  @TreasurerMethod({ hasNextPaginate: ContractFullDto })
  async findFullWithPaginate(@Query() dto: ContractAdminPaginateDto): Promise<IPaginateHasNextResult<IContract>> {
    const { paginate, model } = queryPaginateParser(dto, ContractQueryDto);
    const result = await this.service.find(model, { ...paginate, include: ['file', 'agent'] });
    return paginateHasNextPlainToClass(ContractFullDto, result);
  }
}
