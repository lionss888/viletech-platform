import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { AccountRole } from '../lib/enums/models/account.enums';
import { AllCurrencies } from '../lib/enums/common.enums';
import { currencyType } from '../modules/currency/currency.contants';
import { CurrencyType } from '../lib/enums/models/currency.enums';
import { VirtualAccountType } from '../lib/enums/models/virtual-account.enums';

export class AddThbChfCurrencies extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  private get accountCollection() {
    return this.connection.collection('accounts');
  }

  private get virtualAccountCollection() {
    return this.connection.collection('virtual_accounts');
  }

  private get liquidityCollection() {
    return this.connection.collection('liquidity');
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
      // 1. Обновляем документы liquidity, добавляя поля thb и chf
      // Обновляем import.thb если поле не существует
      await this.liquidityCollection.updateMany({ 'import.thb': { $exists: false } }, { $set: { 'import.thb': 0 } });

      // Обновляем import.chf если поле не существует
      await this.liquidityCollection.updateMany({ 'import.chf': { $exists: false } }, { $set: { 'import.chf': 0 } });

      // Обновляем export.thb если поле не существует
      await this.liquidityCollection.updateMany({ 'export.thb': { $exists: false } }, { $set: { 'export.thb': 0 } });

      // Обновляем export.chf если поле не существует
      await this.liquidityCollection.updateMany({ 'export.chf': { $exists: false } }, { $set: { 'export.chf': 0 } });

      // 2. Создаем виртуальные счета для THB и CHF для всех существующих пользователей
      const newCurrencies = [AllCurrencies.THB, AllCurrencies.CHF];
      const users = await this.accountCollection
        .find({
          roles: AccountRole.USER,
        })
        .toArray();

      for (const user of users) {
        try {
          const userId = user._id;

          for (const currency of newCurrencies) {
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
