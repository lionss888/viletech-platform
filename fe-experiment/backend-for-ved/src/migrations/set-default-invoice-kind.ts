/* eslint-disable no-console */
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

/**
 * Migration: Set default invoice kind='good' for legacy invoices without kind field
 *
 * Rationale:
 * - HS codes (ТН ВЭД) are mandatory for goods but optional for services
 * - Legacy invoices created before V-39 don't have the 'kind' field
 * - Frontend/backend treats undefined 'kind' as 'good' (conservative default)
 * - This migration explicitly sets 'kind' for all legacy invoices
 *
 * Risk Assessment:
 * - Most legacy invoices are goods (HS codes were for goods before V-39)
 * - If incorrectly marked: Users can manually change kind='service' in UI
 * - Impact: Low-risk (non-destructive, user can correct if needed)
 */
export class SetDefaultInvoiceKind extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up(): Promise<void> {
    console.log('Starting: Set default invoice kind to "good" for legacy data');

    // Dry-run: Count affected invoices
    const affectedDocs = await this.connection.collection('form-payments').countDocuments({
      'invoices.kind': { $exists: false },
    });

    console.log(`Found ${affectedDocs} form-payments with invoices missing "kind" field`);

    // Update: Set kind='good' for all invoices without kind
    const result = await this.connection.collection('form-payments').updateMany(
      { 'invoices.kind': { $exists: false } },
      {
        $set: {
          'invoices.$[elem].kind': 'good',
        },
      },
      {
        arrayFilters: [{ 'elem.kind': { $exists: false } }],
      },
    );

    console.log(
      `Migration completed: ${result.modifiedCount} documents updated, ` + `${result.matchedCount} documents matched`,
    );

    // Verification: Count remaining unmigratedInvoices
    const remainingUnmigratedCount = await this.connection.collection('form-payments').countDocuments({
      invoices: {
        $elemMatch: { kind: { $exists: false } },
      },
    });

    if (remainingUnmigratedCount === 0) {
      console.log('Verification passed: All invoices now have "kind" field');
    } else {
      console.warn(`Warning: ${remainingUnmigratedCount} invoices still missing "kind" field`);
    }
  }

  async down(): Promise<void> {
    console.log('Rolling back: Remove "kind" field from invoices');

    const result = await this.connection.collection('form-payments').updateMany(
      { 'invoices.kind': 'good' },
      {
        $unset: {
          'invoices.$[].kind': '',
        },
      },
    );

    console.log(`Rollback completed: ${result.modifiedCount} documents updated`);
  }
}
