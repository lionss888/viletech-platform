import { Module } from '@nestjs/common';
import { ContractRpcModule } from './rpc/contract-rpc.module';
import { ContractAdminModule } from './web/admin/contract-admin.module';
import { ContractSiteModule } from './web/site/contract-site.module';
import { ContractTreasurerModule } from './web/treasurer/contract-treasurer.module';

@Module({
  imports: [ContractAdminModule, ContractSiteModule, ContractRpcModule, ContractTreasurerModule],
})
export class ContractModule {}
