import { Module } from '@nestjs/common';
import { ContractSiteController } from './contract-site.controller';
import { ContractServiceModule } from '../../service/contract.service.module';
import { DiadocServiceModule } from '../../../diadoc/service/diadoc.service.module';

@Module({
  imports: [ContractServiceModule, DiadocServiceModule], // VF-2: Добавлен DiadocServiceModule
  controllers: [ContractSiteController],
})
export class ContractSiteModule {}
