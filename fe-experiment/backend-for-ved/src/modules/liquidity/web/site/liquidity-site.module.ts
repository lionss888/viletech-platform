import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquiditySiteController } from './liquidity-site.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquiditySiteController],
})
export class LiquiditySiteModule {}
