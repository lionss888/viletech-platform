import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import * as _ from 'lodash';
import { FormPaymentStatus } from '../lib/enums/models/form-payment.enums';

export class MigrateContractsToOrganization extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  formCollection = this.connection.collection('form-payments');
  organizationCollection = this.connection.collection('organizations');
  contractCollection = this.connection.collection('contracts');

  async up() {
    // 1. берем все подтвержденные контракты (не шаблоны), группируем по аккаунт (для оптимизации запроса)
    // находим последнюю добавленную подтвержденную организацию по аккаунту контракта,
    // на выходе получаем, для каких контрактов нужно добавить поле organization,
    // тем самым мы свезем теперь не аккаунт с контрактом, а организацию с агентом
    const result = await this.contractCollection
      .aggregate([
        // Первый этап: фильтрация контрактов
        {
          $match: {
            status: 'accepted',
            isTemplate: false,
          },
        },

        // Группировка по account и agent
        {
          $group: {
            _id: {
              account: '$account',
            },
            contracts: {
              $push: {
                _id: '$_id',
              },
            },
          },
        },

        // Lookup для получения информации об организации
        {
          $lookup: {
            from: 'organizations',
            let: { accountId: '$_id.account' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$account', '$$accountId'] }, { $eq: ['$status', 'approved'] }],
                  },
                },
              },
              { $sort: { createDate: -1 } },
              { $limit: 1 },
            ],
            as: 'organization',
          },
        },

        // Разворачиваем массив organization (чтобы получить _id)
        {
          $unwind: {
            path: '$organization',
            preserveNullAndEmptyArrays: true,
          },
        },

        // Формируем итоговый результат
        {
          $project: {
            _id: 0,
            contractIds: '$contracts._id',
            organizationId: '$organization._id',
          },
        },
      ])
      .toArray();

    const parts = _.chunk(result, 100);

    for (const partResult of parts) {
      const bulkData = _.map(partResult, (item) => {
        return {
          updateOne: {
            filter: { _id: { $in: item.contractIds } },
            update: { $set: { organization: item.organizationId } },
          },
        };
      });

      await this.contractCollection.bulkWrite(bulkData);
    }

    // 2. удалить контаркты, где нет организации и это не шаблон
    // sdf
    await this.contractCollection.deleteMany({
      $or: [
        {
          organization: { $exists: false },
        },
        {
          organization: null,
        },
      ],
      isTemplate: false,
    });

    // 3. в заявках со статусом form accepted удалим агента, чтобы можно было заново выбрать,
    // и система проверит есть ли контракт

    await this.formCollection.updateMany(
      {
        status: FormPaymentStatus.FORM_ACCEPTED,
      },
      {
        $unset: { agent: true },
      },
    );
  }
}
