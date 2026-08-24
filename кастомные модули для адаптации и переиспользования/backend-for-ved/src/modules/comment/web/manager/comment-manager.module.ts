import { Module } from '@nestjs/common';
import { CommentManagerController } from './comment-manager.controller';
import { CommentServiceModule } from 'modules/comment/service/comment.service.module';

@Module({
  imports: [CommentServiceModule],
  controllers: [CommentManagerController],
})
export class CommentManagerModule {}
