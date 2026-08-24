import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentService } from './comment.service';
import { Comment, CommentSchema } from './comment.schema';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { COMMENT_CLIENT, COMMENT_SERVICE } from '../comment.constants';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { FormPaymentServiceModule } from '../../form-payment/service/form-payment.service.module';
import { OrganizationServiceModule } from '../../organization/service/organization.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    NatsModule(COMMENT_CLIENT),
    BullModule.registerQueue({ name: JobQueueName.COMMENT_QUEUE }),
    forwardRef(() => FormPaymentServiceModule),
    OrganizationServiceModule,
  ],
  providers: [{ provide: COMMENT_SERVICE, useClass: CommentService }],
  exports: [{ provide: COMMENT_SERVICE, useClass: CommentService }],
})
export class CommentServiceModule {}
