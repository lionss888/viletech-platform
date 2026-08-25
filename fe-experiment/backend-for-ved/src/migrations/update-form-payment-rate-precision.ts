import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';

/**
 * Обновление precision курсов в заявках:
 * - currency.rate: раньше хранился в формате UI (×100), теперь — реальный курс
 *   client per 1 counterparty (до 4 знаков после запятой).
 * - currency.fixFeeRate: аналогично.
 *
 * Миграция делит существующие значения на 100, чтобы привести старые данные
 * к новому формату.
 */
export class UpdateFormPaymentRatePrecision extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const formPaymentCollection = this.connection.collection<IFormPayment>('form-payments');

    // Переводим currency.rate из формата ×100 в «сырое» значение
    await formPaymentCollection.updateMany(
      {
        'currency.rate': { $exists: true },
      },
      {
        $mul: { 'currency.rate': 0.01 },
      },
    );

    // Переводим currency.fixFeeRate из формата ×100 в «сырое» значение
    await formPaymentCollection.updateMany(
      {
        'currency.fixFeeRate': { $exists: true },
      },
      {
        $mul: { 'currency.fixFeeRate': 0.01 },
      },
    );
  }
}

