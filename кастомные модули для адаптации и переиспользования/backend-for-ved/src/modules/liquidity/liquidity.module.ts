import { Module } from '@nestjs/common';
import { LiquidityAdminModule } from './web/admin/liquidity-admin.module';
import { LiquiditySiteModule } from './web/site/liquidity-site.module';
import { LiquidityQueueModule } from './queue/liquidity-queue.module';
import { LiquidityRpcModule } from './rpc/liquidity-rpc.module';
import { LiquidityProviderModule } from './web/provider/liquidity-provider.module';
import { LiquidityManagerModule } from './web/manager/liquidity-manager.module';
import { LiquidityComplianceOfficerModule } from './web/compliance-officer/liquidity-compliance-officer.module';
import { LiquidityInternalComplianceOfficerModule } from './web/internal-compliance-officer/liquidity-internal-compliance-officer.module';

@Module({
  imports: [
    LiquiditySiteModule,
    LiquidityAdminModule,
    LiquidityProviderModule,
    LiquidityManagerModule,
    LiquidityComplianceOfficerModule,
    LiquidityInternalComplianceOfficerModule,
    LiquidityQueueModule,
    LiquidityRpcModule,
  ],
})
export class LiquidityModule {}
