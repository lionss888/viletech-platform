import { Controller, Inject } from '@nestjs/common';
import { IContractService } from '../service/contract.service.interface';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { ContractPattern } from 'lib/enums/models/contract.enums';
import { ContractRPCQueryDto } from '../dto/contract.query.dto';
import { IContract } from '../../../lib/interfaces/models/contract.interface';
import { ContractRPCUpdateDto } from '../dto/contract.update.dto';

@Controller()
export class ContractRpcController {
  constructor(@Inject('IContractService') private readonly service: IContractService) {}

  @CatcherMessagePattern(ContractPattern.FIND_MANY)
  async findMany(data: ContractRPCQueryDto): Promise<IContract[]> {
    return this.service.findMany(data.query, data.options);
  }

  @CatcherMessagePattern(ContractPattern.FIND_ONE)
  async findOne(data: ContractRPCQueryDto): Promise<IContract> {
    return this.service.findOne(data.query, data.options);
  }

  @CatcherMessagePattern(ContractPattern.UPDATE_MANY)
  async updateMany({ query, update }: ContractRPCUpdateDto): Promise<void> {
    return this.service.updateMany(query, update);
  }
}
