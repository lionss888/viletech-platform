import { Module } from '@nestjs/common';
import { ContractRpcController } from './contract-rpc.controller';
import { ContractServiceModule } from '../service/contract.service.module';

@Module({
  imports: [ContractServiceModule],
  controllers: [ContractRpcController],
})
export class ContractRpcModule {}
