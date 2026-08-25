import { Module } from '@nestjs/common';
import { CommentProviderController } from './comment-provider.controller';
import { CommentServiceModule } from 'modules/comment/service/comment.service.module';

@Module({
  imports: [CommentServiceModule],
  controllers: [CommentProviderController],
})
export class CommentProviderModule {}
