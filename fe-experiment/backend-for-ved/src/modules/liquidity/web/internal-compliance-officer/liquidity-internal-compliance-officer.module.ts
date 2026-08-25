import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquidityInternalComplianceOfficerController } from './liquidity-internal-compliance-officer.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityInternalComplianceOfficerController],
})
export class LiquidityInternalComplianceOfficerModule {}
