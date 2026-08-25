import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquidityAdminController } from './liquidity-admin.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityAdminController],
})
export class LiquidityAdminModule {}
