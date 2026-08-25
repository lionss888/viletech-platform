import { MigrationClass } from 'lib/modules/migration/migration.module';
import { LiquidityPattern } from '../lib/enums/models/liquidity.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { AllCurrencies } from '../lib/enums/common.enums';
import {
  LiquidityExportRates,
  LiquidityCommitmentsRates,
  LiquidityImportRates,
} from '../lib/interfaces/models/liquidity.interface';

export class CreateLiquidity extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    // Инициализируем export со всеми валютами с amount: 0 и пустым массивом providerOrganization (новая структура)
    const exportData: LiquidityExportRates = { totalAmount: 0 };
    Object.values(AllCurrencies).forEach((currency) => {
      exportData[currency] = { amount: 0, providerOrganization: [] };
    });

    const commitmentsData: LiquidityCommitmentsRates = { totalAmount: 0 };
    Object.values(AllCurrencies).forEach((currency) => {
      commitmentsData[currency] = { amount: 0, providerOrganization: [] };
    });

    const importData: LiquidityImportRates = { totalAmount: 0 };
    Object.values(AllCurrencies).forEach((currency) => {
      importData[currency] = { amount: 0 };
    });

    await this.client.send(LiquidityPattern.CREATE, {
      import: importData,
      export: exportData,
      commitments: commitmentsData,
    });
  }
}
