import { MigrationClass } from 'lib/modules/migration/migration.module';
import { AgentPattern } from '../lib/enums/models/agent.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class CreateAgents extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    await this.client.send(AgentPattern.CREATE_MANY, {
      agents: [
        {
          organizationName: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ПРОЛАНДИЯ"',
          inn: '9909669155',
          kpp: '780687001',
          email: 'info@info.com',
          phone: '+79999999999',
          director: {
            name: 'Иванов Иван Иванович',
          },
          requisites: [
            {
              bankName: 'ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ',
              accountNumber: '40807810924960000075',
              bankCountry: 'RU',
              bik: '044525411',
              corrNumber: '30101810145250000411',
            },
            {
              bankName: 'Ф-Л ПАО "БАНК "САНКТ-ПЕТЕРБУРГ" В Г. МОСКВЕ',
              accountNumber: '40807810777000000161',
              bankCountry: 'RU',
              bik: '044525142',
              corrNumber: '30101810045250000142',
            },
            {
              bankName: 'БАНК ГПБ (АО) г Москва',
              accountNumber: '40807810400000002096',
              bankCountry: 'RU',
              bik: '044525823',
              corrNumber: '30101810200000000823',
            },
            {
              bankName: 'АО "АЛЬФА-БАНК"',
              accountNumber: '40807810901850000466',
              bankCountry: 'RU',
              bik: '044525593',
              corrNumber: '30101810200000000593',
            },
          ],
        },
        {
          organizationName: 'Общество с ограниченной ответственностью "Маунтин Пик"',
          inn: '9909681924',
          kpp: '780687001',
          email: 'info@info.com',
          phone: '+79999999999',
          director: {
            name: 'Петров Пётр Петрович',
          },
          requisites: [
            {
              bankName: 'ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)',
              accountNumber: '40807810724960000107',
              bankCountry: 'RU',
              bik: '044525411',
              corrNumber: '30101810145250000411',
            },
            {
              bankName: 'ООО "Банк 131"',
              accountNumber: '40807810800000000074',
              bankCountry: 'RU',
              bik: '049205131',
              corrNumber: '30101810822029205131',
            },
          ],
        },
        {
          organizationName: 'Общество с ограниченной ответственностью "ИСТ КА Групп"',
          inn: '9909681681',
          kpp: '780687001',
          email: 'info@info.com',
          phone: '+79999999999',
          director: {
            name: 'Сидоров Сергей Сергеевич',
          },
          requisites: [
            {
              bankName: 'ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)',
              accountNumber: '40807810324960000109',
              bankCountry: 'RU',
              bik: '044525411',
              corrNumber: '30101810145250000411',
            },
          ],
        },
      ],
    });
  }
}
