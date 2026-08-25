import { Module, forwardRef } from '@nestjs/common';
import { CommentSiteController } from './comment-site.controller';
import { CommentServiceModule } from '../../service/comment.service.module';
import { FormPaymentServiceModule } from '../../../form-payment/service/form-payment.service.module';

@Module({
  imports: [CommentServiceModule, forwardRef(() => FormPaymentServiceModule)],
  controllers: [CommentSiteController],
})
export class CommentSiteModule {}
