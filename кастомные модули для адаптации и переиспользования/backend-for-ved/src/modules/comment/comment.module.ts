import { Module } from '@nestjs/common';
import { CommentRpcModule } from './rpc/comment-rpc.module';
import { CommentManagerModule } from './web/manager/comment-manager.module';
import { CommentServiceModule } from './service/comment.service.module';
import { CommentProviderModule } from './web/provider/comment-provider.module';
import { CommentSiteModule } from './web/site/comment-site.module';
import { CommentQueueModule } from './queue/comment-queue.module';

@Module({
  imports: [
    CommentManagerModule,
    CommentProviderModule,
    CommentRpcModule,
    CommentServiceModule,
    CommentSiteModule,
    CommentQueueModule,
  ],
})
export class CommentModule {}
