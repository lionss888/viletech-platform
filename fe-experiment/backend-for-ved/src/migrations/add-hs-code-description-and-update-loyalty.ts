import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { HsCodeLoyalty } from '../lib/enums/models/hs-code.enums';

export class AddHsCodeDescriptionAndUpdateLoyalty extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    // 1. Add description field with default empty string to existing HS codes
    await this.connection.collection('hs-codes').updateMany(
      { description: { $exists: false } },
      {
        $set: {
          description: '',
        },
      },
    );

    // 2. Update loyalty enum values in hs-codes: medium -> not_quite_ok, high -> not_ok
    await this.connection.collection('hs-codes').updateMany(
      { loyalty: 'medium' },
      {
        $set: {
          loyalty: HsCodeLoyalty.NOT_QUITE_OK,
        },
      },
    );

    await this.connection.collection('hs-codes').updateMany(
      { loyalty: 'high' },
      {
        $set: {
          loyalty: HsCodeLoyalty.NOT_OK,
        },
      },
    );

    // 3. Add description field to form-payments snapshots (fix P0-1)
    await this.connection.collection('form-payments').updateMany(
      { 'invoices.hsCodes.description': { $exists: false } },
      {
        $set: {
          'invoices.$[inv].hsCodes.$[code].description': '',
        },
      },
      {
        arrayFilters: [{ 'inv.hsCodes': { $exists: true } }, { 'code.description': { $exists: false } }],
      },
    );

    // 4. Update loyalty in form-payments snapshots: medium -> not_quite_ok
    await this.connection.collection('form-payments').updateMany(
      { 'invoices.hsCodes.loyalty': 'medium' },
      {
        $set: {
          'invoices.$[inv].hsCodes.$[code].loyalty': HsCodeLoyalty.NOT_QUITE_OK,
        },
      },
      {
        arrayFilters: [{ 'inv.hsCodes': { $exists: true } }, { 'code.loyalty': 'medium' }],
      },
    );

    // 5. Update loyalty in form-payments snapshots: high -> not_ok
    await this.connection.collection('form-payments').updateMany(
      { 'invoices.hsCodes.loyalty': 'high' },
      {
        $set: {
          'invoices.$[inv].hsCodes.$[code].loyalty': HsCodeLoyalty.NOT_OK,
        },
      },
      {
        arrayFilters: [{ 'inv.hsCodes': { $exists: true } }, { 'code.loyalty': 'high' }],
      },
    );
  }
}
