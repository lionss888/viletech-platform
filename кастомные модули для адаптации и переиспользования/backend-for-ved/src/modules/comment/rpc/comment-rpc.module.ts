import { Module } from '@nestjs/common';
import { CommentRpcController } from './comment-rpc.controller';
import { CommentServiceModule } from '../service/comment.service.module';

@Module({
  imports: [CommentServiceModule],
  controllers: [CommentRpcController],
})
export class CommentRpcModule {}
