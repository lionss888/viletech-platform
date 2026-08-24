import { Module } from '@nestjs/common';
import { LiquidityRpcController } from './liquidity-rpc.controller';
import { LiquidityServiceModule } from '../service/liquidity.service.module';

@Module({
  imports: [LiquidityServiceModule],
  controllers: [LiquidityRpcController],
})
export class LiquidityRpcModule {}
