import { Module } from '@nestjs/common';
import { ContractAdminController } from './contract-admin.controller';
import { ContractServiceModule } from '../../service/contract.service.module';

@Module({
  imports: [ContractServiceModule],
  controllers: [ContractAdminController],
})
export class ContractAdminModule {}
