/* eslint-disable no-console */
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

export class CreateInitialFormPaymentStatuses extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  private readonly formPaymentCollection = this.connection.collection('form-payments');
  private readonly formPaymentStatusCollection = this.connection.collection('form-payment-statuses');

  async up() {
    console.log('Starting migration: create initial FormPaymentStatus records');

    let processed = 0;
    let created = 0;
    let skipped = 0;

    try {
      const formPayments = await this.formPaymentCollection.find({}).toArray();

      for (const fp of formPayments) {
        processed++;

        try {
          const exists = await this.formPaymentStatusCollection.findOne({
            formPaymentId: fp._id,
          });

          if (exists) {
            skipped++;
            continue;
          }

          await this.formPaymentStatusCollection.insertOne({
            formPaymentId: fp._id,
            status: fp.status,
            accountId: fp.account || null,
            accountRoles: [],
            createDate: fp.updateDate || fp.createDate || new Date(),
          });

          created++;

          if (processed % 100 === 0) {
            console.log(`[${processed}] Processed: ${processed}, Created: ${created}, Skipped: ${skipped}`);
          }
        } catch (error) {
          console.error(`[${processed}] Error processing FormPayment ${fp._id}: ${error.message}`, error.stack);
          throw error;
        }
      }

      console.log(`Migration completed: Processed: ${processed}, Created: ${created}, Skipped: ${skipped}`);
    } catch (error) {
      console.error(`Migration failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
