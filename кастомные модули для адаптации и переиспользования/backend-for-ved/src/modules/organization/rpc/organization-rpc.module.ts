import { Module } from '@nestjs/common';
import { OrganizationRpcController } from './organization-rpc.controller';
import { OrganizationServiceModule } from '../service/organization.service.module';

@Module({
  imports: [OrganizationServiceModule],
  controllers: [OrganizationRpcController],
})
export class OrganizationRpcModule {}
