import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ContractServiceModule } from '../../service/contract.service.module';
import { ContractTreasurerController } from './contract-treasurer.controller';

@Module({
  imports: [PassportModule, JwtModule.register({}), ContractServiceModule],
  controllers: [ContractTreasurerController],
})
export class ContractTreasurerModule {}

