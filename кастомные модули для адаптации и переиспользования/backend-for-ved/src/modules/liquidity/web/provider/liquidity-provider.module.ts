import { Module } from '@nestjs/common';
import { LiquidityServiceModule } from '../../service/liquidity.service.module';
import { LiquidityProviderController } from './liquidity-provider.controller';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityProviderController],
})
export class LiquidityProviderModule {}
