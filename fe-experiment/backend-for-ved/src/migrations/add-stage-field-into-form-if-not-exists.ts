import { MigrationClass } from '../lib/modules/migration/migration.module';
import { Connection } from 'mongoose';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import {
  importAdvanceStagesHash,
  importPostpayStagesHash,
  exportStagesHash,
  StageHash,
} from '../lib/constants/models/form-payment.constants';
import { FormPaymentStage, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';
import { FormPaymentDirection, FormPaymentCondition } from '../lib/enums/models/form-payment.enums';

export class AddStageFieldIntoFormIfNotExists extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const collection = this.connection.collection('form-payments');

    const cursor = collection.find({ stage: { $exists: false }, status: { $exists: true } });

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      const { direction, platformPaymentCondition, status, prevStatus } = doc;

      let stagesHash: StageHash | undefined;

      if (direction === FormPaymentDirection.IMPORT && platformPaymentCondition === FormPaymentCondition.ADVANCE) {
        stagesHash = importAdvanceStagesHash;
      } else if (
        direction === FormPaymentDirection.IMPORT &&
        platformPaymentCondition === FormPaymentCondition.POST_PAYMENT
      ) {
        stagesHash = importPostpayStagesHash;
      } else if (direction === FormPaymentDirection.EXPORT) {
        stagesHash = exportStagesHash;
      }

      if (!stagesHash) {
        if (doc.status === FormPaymentStatus.DRAFT || doc.status === FormPaymentStatus.CREATING) {
          await collection.updateOne({ _id: doc._id }, { $set: { stage: FormPaymentStage.NEW } });
        }

        continue;
      }

      let foundStage: FormPaymentStage | undefined;

      for (const [stage, statuses] of stagesHash) {
        for (const s of statuses) {
          if (typeof s === 'object' && s !== null && 'status' in s && 'prevStatus' in s) {
            if (s.status === status && s.prevStatus.includes(prevStatus)) {
              foundStage = stage;
              break;
            }
          } else if (s === status) {
            foundStage = stage;
            break;
          }
        }
        if (foundStage) break;
      }

      if (foundStage) {
        await collection.updateOne({ _id: doc._id }, { $set: { stage: foundStage } });
      }
    }
  }
}
