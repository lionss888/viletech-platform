import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquidityComplianceOfficerController } from './liquidity-compliance-officer.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityComplianceOfficerController],
})
export class LiquidityComplianceOfficerModule {}
