import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { AccountRole } from '../lib/enums/models/account.enums';
import { AllCurrencies } from '../lib/enums/common.enums';
import { currencyType } from '../modules/currency/currency.contants';
import { CurrencyType } from '../lib/enums/models/currency.enums';
import { VirtualAccountType } from '../lib/enums/models/virtual-account.enums';

export class CreateVirtualAccountsForUsers extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  private get accountCollection() {
    return this.connection.collection('accounts');
  }

  private get virtualAccountCollection() {
    return this.connection.collection('virtual_accounts');
  }

  /**
   * Определяет тип виртуального счета (fiat/crypto) на основе типа валюты
   */
  private getVirtualAccountType(currency: AllCurrencies): VirtualAccountType {
    const currencyTypeValue = currencyType[currency];
    if (currencyTypeValue === CurrencyType.COIN || currencyTypeValue === CurrencyType.STABLECOIN) {
      return VirtualAccountType.CRYPTO;
    }
    return VirtualAccountType.FIAT;
  }

  async up() {
    try {
      // Получаем всех пользователей с ролью USER
      const users = await this.accountCollection
        .find({
          roles: AccountRole.USER,
        })
        .toArray();

      // Получаем все валюты
      const allCurrencies = Object.values(AllCurrencies);

      for (const user of users) {
        try {
          const userId = user._id;

          for (const currency of allCurrencies) {
            const accountType = this.getVirtualAccountType(currency);

            // Проверяем, существует ли уже виртуальный счет
            const exists = await this.virtualAccountCollection.findOne({
              account: userId,
              currency: currency,
              type: accountType,
            });

            if (exists) {
              continue;
            }

            // Создаем виртуальный счет с нулевыми значениями
            await this.virtualAccountCollection.insertOne({
              account: userId,
              currency: currency,
              available: 0,
              reserved: 0,
              totalBalance: 0,
              type: accountType,
              createDate: new Date(),
              updateDate: new Date(),
            });
          }
        } catch (error) {
          // Продолжаем обработку других пользователей
        }
      }
    } catch (error) {
      throw error;
    }
  }
}
