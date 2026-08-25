/* eslint-disable no-console */
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { OrganizationType } from '../lib/enums/models/organization.enums';

export class AddRefOrganizationIdToFormPayments extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  private readonly formPaymentCollection = this.connection.collection('form-payments');
  private readonly organizationCollection = this.connection.collection('organizations');

  private readonly BATCH_SIZE = 100;
  private readonly COMPARABLE_FIELDS = [
    'inn',
    'ogrn',
    'kpp',
    'legalAddress',
    'fullName',
    'email',
    'phone',
    'signerName',
    'signerPosition',
    'businessForm',
  ];

  async up() {
    console.log('Starting migration: add refOrganizationId to FormPayments');

    let processed = 0;
    let linked = 0;
    let skipped = 0;
    let cursor;

    try {
      cursor = this.formPaymentCollection
        .find({
          'organization.refOrganizationId': { $exists: false },
          'organization.inn': { $exists: true },
          account: { $exists: true },
        })
        .batchSize(this.BATCH_SIZE);

      for await (const fp of cursor) {
        processed++;

        try {
          if (!fp.organization?.inn || !fp.account) {
            console.warn(`[${processed}] Skipping FormPayment ${fp._id}: missing inn or account`);
            skipped++;
            continue;
          }

          let org = await this.organizationCollection.findOne({
            inn: fp.organization.inn,
            account: fp.account,
            name: fp.organization.name,
            type: OrganizationType.USER,
            isDeleted: { $ne: true },
          });

          let isChanged = false;

          if (org) {
            isChanged = this.COMPARABLE_FIELDS.some((field) => {
              const fpValue = fp.organization[field];
              const orgValue = org[field];
              return fpValue !== orgValue && fpValue !== undefined && orgValue !== undefined;
            });

            if (isChanged) {
              console.warn(`[${processed}] FormPayment ${fp._id}: snapshot differs, not linking`);
              skipped++;
              continue;
            }
          } else {
            org = await this.organizationCollection.findOne({
              inn: fp.organization.inn,
              account: fp.account,
              type: OrganizationType.USER,
              isDeleted: { $ne: true },
            });

            if (org) {
              isChanged = true;
            } else {
              console.warn(`[${processed}] FormPayment ${fp._id}: no organization found (inn: ${fp.organization.inn})`);
              skipped++;
              continue;
            }
          }

          await this.formPaymentCollection.updateOne(
            { _id: fp._id },
            {
              $set: {
                'organization.refOrganizationId': org._id,
                'organization.isChanged': isChanged,
              },
            },
          );

          linked++;
          if (processed % 100 === 0) {
            console.log(`[${processed}] Processed: ${processed}, Linked: ${linked}, Skipped: ${skipped}`);
          }
        } catch (error) {
          console.error(
            `[${processed}] Error processing FormPayment ${fp._id} (INN: ${fp.organization?.inn}): ${error.message}`,
            error.stack,
          );
          throw error;
        }
      }

      console.log(`Migration completed: Processed: ${processed}, Linked: ${linked}, Skipped: ${skipped}`);
    } catch (error) {
      console.error(`Migration failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (cursor) {
        await cursor.close();
      }
    }
  }
}
