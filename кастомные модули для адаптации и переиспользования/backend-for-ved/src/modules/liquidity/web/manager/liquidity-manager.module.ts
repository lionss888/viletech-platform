import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquidityManagerController } from './liquidity-manager.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityManagerController],
})
export class LiquidityManagerModule {}
