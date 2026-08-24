import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IComment } from 'lib/interfaces/models/comment.interface';
import { CommentEntityType } from 'lib/enums/models/comment.enums';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';

export class AddEntityAccountToComment extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const commentsCollection = this.connection.collection<IComment>('comments');

    const formPaymentsCollection = this.connection.collection<IFormPayment>('form-payments');

    // Найдём комментарии без entityAccount
    const cursor = commentsCollection.find({
      entityAccount: { $exists: false },
      entityType: CommentEntityType.FORM_PAYMENT,
    });

    while (await cursor.hasNext()) {
      const comment = await cursor.next();
      if (!comment) continue;

      // Получаем связанный entity-документ
      const formPayment = await formPaymentsCollection.findOne({ _id: comment.entity });
      if (!formPayment || !formPayment.account) continue;

      // Обновляем комментарий
      await commentsCollection.updateOne({ _id: comment._id }, { $set: { entityAccount: formPayment.account } });
    }
  }
}
