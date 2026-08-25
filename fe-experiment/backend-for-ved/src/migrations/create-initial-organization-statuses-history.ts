/* eslint-disable no-console */
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { OrganizationType } from '../lib/enums/models/organization.enums';

export class CreateInitialOrganizationStatusesHistory extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  private readonly organizationCollection = this.connection.collection('organizations');
  private readonly organizationStatusesHistoryCollection = this.connection.collection('organization-statuses-history');

  async up() {
    console.log('Starting migration: create initial OrganizationStatusesHistory records');

    let processed = 0;
    let created = 0;
    let skipped = 0;

    try {
      const organizations = await this.organizationCollection
        .find({
          type: OrganizationType.USER,
        })
        .toArray();

      for (const org of organizations) {
        processed++;

        try {
          const exists = await this.organizationStatusesHistoryCollection.findOne({
            organizationId: org._id,
          });

          if (exists) {
            skipped++;
            continue;
          }

          await this.organizationStatusesHistoryCollection.insertOne({
            organizationId: org._id,
            status: org.status,
            accountId: org.account || null,
            accountRoles: [],
            createDate: org.updateDate || org.createDate || new Date(),
          });

          created++;

          if (processed % 100 === 0) {
            console.log(`[${processed}] Processed: ${processed}, Created: ${created}, Skipped: ${skipped}`);
          }
        } catch (error) {
          console.error(
            `[${processed}] Error processing Organization ${org._id} (INN: ${org.inn}): ${error.message}`,
            error.stack,
          );
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
